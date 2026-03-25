let newX = 0, newY = 0, startX = 0, startY = 0, activeBox = null, pane = null, renderTimeout = null; // variables globales pour gérer déplacement, resize et délai de rendu

const bars = document.querySelectorAll(".bar"); // récupère toutes les barres de drag
const cornWindows = document.querySelectorAll(".corner"); // récupère tous les coins de resize
const borders = document.querySelector(".screen"); // récupère le conteneur principal
const menuBorder = document.querySelector(".separationMenu"); // récupère la séparation du menu
const renderFrame = document.getElementById("windowRender"); // récupère l'iframe de rendu
const consoleOutput = document.getElementById("consoleOutput"); // récupère la zone d'affichage de la console perso

bars.forEach(bar => { bar.addEventListener("mousedown", mouseDown) }); // active le drag sur chaque barre
cornWindows.forEach(corner => { corner.addEventListener("mousedown", resizeWindow) }); // active le resize sur chaque coin

function mouseDown(e){ // déclenché au clic sur une barre
    document.querySelectorAll(".bloc").forEach(el => el.style.zIndex = 1); // remet tous les blocs derrière
    activeBox = e.target.closest(".bloc"); // récupère le bloc cliqué
    activeBox.style.zIndex = 2; // met ce bloc au-dessus
    document.querySelectorAll("iframe").forEach(el => el.style.pointerEvents = "none"); // désactive interaction iframe pendant drag

    startX = e.clientX; // position X initiale de la souris
    startY = e.clientY; // position Y initiale de la souris

    document.addEventListener("mousemove", mouseMove); // écoute le déplacement de la souris
    document.addEventListener("mouseup", mouseUp); // écoute le relâchement
}

function mouseMove(e){ // gère le déplacement du bloc
    newX = startX - e.clientX; // calcule le déplacement horizontal
    newY = startY - e.clientY; // calcule le déplacement vertical

    startX = e.clientX; // met à jour la position X de référence
    startY = e.clientY; // met à jour la position Y de référence

    const newTop = Math.max(0, Math.min( // limite verticale
        activeBox.offsetTop - newY, // nouvelle position calculée
        borders.clientHeight - activeBox.offsetHeight // limite basse du screen
    ));

    const newLeft = Math.max( // limite horizontale gauche + droite
        menuBorder.offsetLeft + menuBorder.offsetWidth, // empêche de passer sur le menu
        Math.min(
            activeBox.offsetLeft - newX, // nouvelle position calculée
            borders.clientWidth - activeBox.offsetWidth // limite droite du screen
        )
    );

    activeBox.style.top = (newTop / borders.clientHeight) * 100 + "%"; // applique position verticale en %
    activeBox.style.left = (newLeft / borders.clientWidth) * 100 + "%"; // applique position horizontale en %
}

function mouseUp(){ // déclenché quand la souris est relâchée
    document.removeEventListener("mousemove", mouseMove); // arrête le déplacement
    document.removeEventListener("mouseup", mouseUp); // arrête l'écoute du relâchement
    document.querySelectorAll("iframe").forEach(el => el.style.pointerEvents = "auto"); // réactive interaction iframe
}

function resizeWindow(e){ // déclenché au clic sur un coin
    document.querySelectorAll(".bloc").forEach(el => el.style.zIndex = 1); // remet tous les blocs derrière
    document.querySelectorAll("iframe").forEach(el => el.style.pointerEvents = "none"); // désactive interaction iframe

    pane = e.target.closest(".bloc"); // récupère le bloc à redimensionner
    pane.style.zIndex = 2; // met ce bloc au-dessus

    let w = pane.clientWidth; // largeur initiale du bloc
    let h = pane.clientHeight; // hauteur initiale du bloc

    let startX = e.clientX; // position souris X au début
    let startY = e.clientY; // position souris Y au début

    const drag = (e) => { // fonction de resize pendant mouvement
        e.preventDefault(); // empêche comportement par défaut navigateur

        const newWidth = Math.max(200, Math.min( // limite largeur
            w + (e.clientX - startX), // nouvelle largeur calculée
            borders.clientWidth - pane.offsetLeft // limite droite du screen
        ));

        const newHeight = Math.max(100, Math.min( // limite hauteur
            h + (e.clientY - startY), // nouvelle hauteur calculée
            borders.clientHeight - pane.offsetTop // limite basse du screen
        ));

        pane.style.width = (newWidth / borders.clientWidth) * 100 + "%"; // applique largeur en %
        pane.style.height = (newHeight / borders.clientHeight) * 100 + "%"; // applique hauteur en %
    };

    const mouseup = () => { // quand on relâche la souris
        document.removeEventListener("mousemove", drag); // stop resize
        document.removeEventListener("mouseup", mouseup); // stop écoute
        document.querySelectorAll("iframe").forEach(el => el.style.pointerEvents = "auto"); // réactive iframe
    };

    document.addEventListener("mousemove", drag); // écoute le mouvement pour resize
    document.addEventListener("mouseup", mouseup); // écoute la fin du resize
}

// GESTION DE LA CONSOLE PERSO

function clearConsole(){ // vide complètement la console visuelle
    consoleOutput.innerHTML = "";
}

function addConsoleLine(type, messages){ // ajoute une ligne dans la console visuelle
    const line = document.createElement("div"); // crée une nouvelle ligne

    line.textContent = `[${type}] ` + messages.join(" "); // crée le texte affiché

    if (type === "error") line.style.color = "red"; // met les erreurs en rouge
    if (type === "warn") line.style.color = "orange"; // met les warnings en orange
    if (type === "log") line.style.color = "#ddd"; // met les logs normaux en clair

    consoleOutput.appendChild(line); // ajoute la ligne à la console
    consoleOutput.scrollTop = consoleOutput.scrollHeight; // descend automatiquement tout en bas
}

window.addEventListener("message", (event) => { // écoute les messages envoyés depuis l'iframe de rendu
    if (!event.data) return; // arrête si aucun message

    if (event.data.type === "console") { // vérifie si le message reçu concerne la console
        addConsoleLine(event.data.logType, event.data.data); // ajoute le log dans la console perso
    }
});

// CODE DE RENDU

function updatePreview() { // met à jour le rendu de l'iframe
    const html = localStorage.getItem("code_html") || ""; // récupère le HTML sauvegardé
    const css = localStorage.getItem("code_css") || ""; // récupère le CSS sauvegardé
    const js = localStorage.getItem("code_js") || ""; // récupère le JS sauvegardé

    clearConsole(); // vide la console avant chaque nouveau rendu

    const cleanHtml = DOMPurify.sanitize(html, { // nettoie le HTML pour limiter les injections XSS simples
        FORBID_TAGS: ["script"], // interdit les balises script dans le HTML utilisateur
        FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"] // interdit quelques attributs JS dangereux
    });

    renderFrame.srcdoc = `
        <html>
            <head>
                <style>
                    html, body {
                        margin: 0;
                        padding: 0;
                    }
                    ${css}
                </style>
            </head>
            <body>
                ${cleanHtml}

                <script>
                    function sendToParent(type, args) { // envoie les logs de l'iframe vers le parent
                        parent.postMessage({
                            type: "console",
                            logType: type,
                            data: args.map(arg => { // transforme chaque valeur en texte lisible
                                try {
                                    if (typeof arg === "object") {
                                        return JSON.stringify(arg); // transforme les objets en JSON
                                    }
                                    return String(arg); // transforme le reste en texte
                                } catch {
                                    return String(arg); // sécurité si JSON.stringify plante
                                }
                            })
                        }, "*");
                    }

                    console.log = (...args) => sendToParent("log", args); // intercepte console.log
                    console.warn = (...args) => sendToParent("warn", args); // intercepte console.warn
                    console.error = (...args) => sendToParent("error", args); // intercepte console.error

                    window.onerror = function(message, source, lineno, colno, error) { // intercepte les erreurs JS globales
                        sendToParent("error", [message + " ligne " + lineno]); // envoie l'erreur au parent
                    };

                    try { // essaie d'exécuter le JS utilisateur
                        ${js}
                    } catch (err) { // si le JS plante immédiatement
                        console.error(err.message); // affiche l'erreur dans la console perso
                    }
                <\/script>
            </body>
        </html>
    `; // injecte le rendu final dans l'iframe
}

function updatePreviewDelayed(){ // applique un délai avant de relancer le rendu
    clearTimeout(renderTimeout); // annule le précédent timer si on tape encore

    renderTimeout = setTimeout(() => {
        updatePreview(); // lance le rendu après 400 ms d'attente
    }, 400);
}

function toggleConsole() { // affiche ou cache la console
    const consoleBox = document.getElementById("consoleOutput"); // récupère la console

    if (consoleBox.style.display === "none") { // si cachée
        consoleBox.style.display = "block"; // on affiche
    } else {
        consoleBox.style.display = "none"; // sinon on cache
    }
}

// TELECHARGER UN FICHIER HTML

function downloadHtmlFile(){ // télécharge un fichier html complet avec le code HTML, CSS et JS réunis
    const html = localStorage.getItem("code_html") || ""; // récupère le code HTML sauvegardé
    const css = localStorage.getItem("code_css") || ""; // récupère le code CSS sauvegardé
    const js = localStorage.getItem("code_js") || ""; // récupère le code JS sauvegardé

    const fullHtml = `<!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Mon fichier exporté</title>
            <style>
        ${css}
            </style>
        </head>
        <body>
        ${html}
        
        <script>
        ${js}
        <\/script>
        </body>
        </html>`; // assemble les 3 codes dans un seul vrai fichier HTML

    const blob = new Blob([fullHtml], { type: "text/html" }); // crée un fichier virtuel HTML
    const url = URL.createObjectURL(blob); // crée une URL temporaire pour ce fichier

    const a = document.createElement("a"); // crée un lien temporaire
    a.href = url; // met l'URL du fichier dans le lien
    a.download = "mon-projet.html"; // nom du fichier téléchargé
    document.body.appendChild(a); // ajoute le lien au document
    a.click(); // déclenche le téléchargement
    document.body.removeChild(a); // enlève le lien après le clic

    URL.revokeObjectURL(url); // libère l'URL temporaire
}
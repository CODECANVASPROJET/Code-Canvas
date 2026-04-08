let newX = 0, newY = 0, startX = 0, startY = 0, activeBox = null, pane = null, renderTimeout = null; // variables globales pour gérer déplacement, resize et délai de rendu
let currentDisposition = "default";

const bars = document.querySelectorAll(".bar"); // récupère toutes les barres de drag
const cornWindows = document.querySelectorAll(".corner"); // récupère tous les coins de resize
const borders = document.querySelector(".screen"); // récupère le conteneur principal
const menuBorder = document.querySelector(".separationMenu"); // récupère la séparation du menu
const renderFrame = document.getElementById("windowRender"); // récupère l'iframe de rendu
const consoleOutput = document.getElementById("consoleOutput"); // récupère la zone d'affichage de la console perso
const blocHtml = document.getElementById("windowHtml").closest(".bloc");
const blocCss = document.getElementById("windowCss").closest(".bloc");
const blocJs = document.getElementById("windowJs").closest(".bloc");
const blocRender = document.getElementById("windowRender").closest(".bloc");
const blocModel = document.getElementById("windowModel").closest(".bloc");
const dropRender = document.querySelector(".dropRender");

bars.forEach(bar => { bar.addEventListener("mousedown", mouseDown) }); // active le drag sur chaque barre
cornWindows.forEach(corner => { corner.addEventListener("mousedown", resizeWindow) }); // active le resize sur chaque coin

function mouseDown(e){
    document.querySelectorAll(".bloc").forEach(el => el.style.zIndex = 1);
    activeBox = e.target.closest(".bloc");

    const rect = activeBox.getBoundingClientRect();
    const parentRect = borders.getBoundingClientRect();

    currentTop = rect.top - parentRect.top;
    currentLeft = rect.left - parentRect.left;

    const iframe = activeBox.querySelector("iframe");
    if (iframe) iframe.style.opacity = "1";

    if (activeBox.classList.contains("mini")) return;
    activeBox.style.zIndex = 2;
    activeBox.style.opacity = "100%";
    document.querySelectorAll("iframe").forEach(el => el.style.pointerEvents = "none");

    // Si le modèle était snappé, on lui remet une taille fixe au début du drag
    if (activeBox === blocModel && activeBox.dataset.snapped === "true") {
        activeBox.style.width = "15vw";
        activeBox.style.height = "30vh";
        activeBox.dataset.snapped = "false";

        // Centre le bloc sous la souris
        const w = activeBox.offsetWidth;
        const h = activeBox.offsetHeight;
        const parentRect = borders.getBoundingClientRect();
        const newLeft = e.clientX - parentRect.left - w / 2;
        activeBox.style.left = (newLeft / borders.clientWidth) * 100 + "%";
    }

    startX = e.clientX;
    startY = e.clientY;

    document.addEventListener("mousemove", mouseMove);
    document.addEventListener("mouseup", mouseUp);
}

function mouseMove(e){
    const parentRect = borders.getBoundingClientRect();
    const barHeight = activeBox.querySelector(".bar").offsetHeight;

    const newTop = Math.max(0, Math.min(
        e.clientY - parentRect.top - barHeight / 2,
        borders.clientHeight - activeBox.offsetHeight
    ));

    const newLeft = Math.max(
        menuBorder.offsetLeft + menuBorder.offsetWidth,
        Math.min(
            e.clientX - parentRect.left - activeBox.offsetWidth / 2,
            borders.clientWidth - activeBox.offsetWidth
        )
    );

    activeBox.style.top = (newTop / borders.clientHeight) * 100 + "%";
    activeBox.style.left = (newLeft / borders.clientWidth) * 100 + "%";
}

function mouseUp(e){
    if (activeBox === blocModel && isMouseInElement(e.clientX, e.clientY, dropRender)) {
        const renderRect = blocRender.getBoundingClientRect();
        const bordersRect = borders.getBoundingClientRect();
        const iframe = activeBox.querySelector("iframe");
    
        const top = renderRect.top - bordersRect.top;
        const left = renderRect.left - bordersRect.left;
        const width = renderRect.width;
        const height = renderRect.height;
    
        activeBox.style.top = (top / borders.clientHeight) * 100 + "%";
        activeBox.style.left = (left / borders.clientWidth) * 100 + "%";
        activeBox.style.width = (width / borders.clientWidth) * 100 + "%";
        activeBox.style.height = (height / borders.clientHeight) * 100 + "%";
        activeBox.dataset.snapped = "true";
        iframe.style.opacity = "50%";
    }
    document.removeEventListener("mousemove", mouseMove);
    document.removeEventListener("mouseup", mouseUp);
    document.querySelectorAll("iframe").forEach(el => el.style.pointerEvents = "auto");
}

function resizeWindow(e){ // déclenché au clic sur un coin
    e.preventDefault(); 

    document.querySelectorAll(".bloc").forEach(el => el.style.zIndex = 1); // remet tous les blocs derrière
    document.querySelectorAll("iframe").forEach(el => el.style.pointerEvents = "none"); // désactive interaction iframe

    pane = e.target.closest(".bloc"); // récupère le bloc à redimensionner
    if (pane.classList.contains("mini")) return;
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
        document.querySelectorAll("iframe").forEach(el => {  // réactive iframe
            if (el.style.display !== "none") el.style.pointerEvents = "auto";
        });
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

// BOUTON AFFICHER LA CONSOLE

function toggleConsole() { // affiche ou cache la console
    const consoleBox = document.getElementById("consoleOutput"); // récupère la console

    if (consoleBox.style.display === "none") { // si cachée
        consoleBox.style.display = "block"; // on affiche
    } else {
        consoleBox.style.display = "none"; // sinon on cache
    }
}

// BOUTON TELECHARGER UN FICHIER HTML

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

// BOUTON APPRENDRE

function modelView() {
    if (document.getElementById("templatesOverlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "templatesOverlay";

    overlay.innerHTML = `
        <div id="templatesModal">
            <div id="templatesList"></div>
        </div>
    `;

    document.body.appendChild(overlay);

    const btnLearning = document.getElementById("btnLearning");
    const templatesList = document.getElementById("templatesList");

    if (btnLearning && templatesList) {
        const clone = btnLearning.cloneNode(true);
        templatesList.appendChild(clone);

        const btnClose = clone.querySelector(".btnClose");

        clone.style.display = "block";

        if (btnClose) {
            btnClose.addEventListener("click", closeWindow);
        }
    }
}

function showLayouts() {
    const overlay = document.getElementById("templatesOverlay");
    if (!overlay) return;

    const btnExercise = overlay.querySelector(".btnExercise");
    const btnLayout = overlay.querySelector(".btnLayout");
    const layoutButtons = overlay.querySelector("#layoutButtons");
    if (layoutButtons) {
        layoutButtons.style.display = "block";
    }

    if (btnLayout) {
        btnExercise.style.display = "none";
        btnLayout.style.display = "none";
    }
}

function showExercise() {
    const overlay = document.getElementById("templatesOverlay");
    if (!overlay) return;

    const btnLayout = overlay.querySelector(".btnLayout");
    const btnExercise = overlay.querySelector(".btnExercise");
    const exerciseButtons = overlay.querySelector("#exerciseButtons");
    if (exerciseButtons) {
        exerciseButtons.style.display = "block";
    }

    if (btnExercise) {
        btnExercise.style.display = "none";
        btnLayout.style.display = "none";
    }
}

function loadLayout(path) {
    const frame = document.getElementById("windowModel");

    if (frame) {
        frame.src = path;
    }

    blocModel.style.display = "block";
    closeWindow();
}

function modelDispositions(){
    if (document.getElementById("modelOverlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "modelOverlay";
    overlay.innerHTML = `
        <div id="modelModal">
            <h2>Choix de disposition</h2>
            <div id="modelOptions">
                <button class="modelOption" data-layout="default">Disposition par défaut</button>
                <button class="modelOption" data-layout="grid">Grille 2x2</button>
                <button class="modelOption" data-layout="top-row">Code en haut / rendu en bas</button>
                <button class="modelOption" data-layout="code-left">Code à gauche / rendu à droite</button>
            </div>
            <button class="btnClose" onclick="closeWindow()">FERMER</button>
        </div>
    `;

    document.body.appendChild(overlay);
    overlay.querySelectorAll(".modelOption").forEach(button => {
        button.addEventListener("click", () => {
            const layout = button.dataset.layout;
            if (layout === "grid") {
                applyDispositionGrid();
            } else if (layout === "top-row") {
                applyDispositionTopRow();
            } else if (layout === "code-left") {
                applyDispositionCodeLeft();
            } else {
                applyDispositionDefault();
            }
            closeWindow();
        });
    });
}

function setBlocStyles(bloc, left, top, width, height) {
    bloc.style.left = left;
    bloc.style.top = top;
    bloc.style.width = width;
    bloc.style.height = height;
}

function applyDispositionDefault() {
    currentDisposition = "default";
    setBlocStyles(blocHtml, "8vw", "3vh", "49vw", "30vh");
    setBlocStyles(blocCss, "8vw", "35vh", "49vw", "30vh");
    setBlocStyles(blocJs, "8vw", "67vh", "49vw", "30vh");
    setBlocStyles(blocRender, "58vw", "3vh", "41vw", "93.9vh");
}

function applyDispositionGrid() {
    currentDisposition = "grid";
    setBlocStyles(blocHtml, "8vw", "3vh", "41vw", "44vh");
    setBlocStyles(blocCss, "51vw", "3vh", "41vw", "44vh");
    setBlocStyles(blocJs, "8vw", "49vh", "41vw", "44vh");
    setBlocStyles(blocRender, "51vw", "49vh", "41vw", "44vh");
}

function applyDispositionTopRow() {
    currentDisposition = "topRow";
    setBlocStyles(blocHtml, "8vw", "3vh", "24vw", "28vh");
    setBlocStyles(blocCss, "34vw", "3vh", "24vw", "28vh");
    setBlocStyles(blocJs, "60vw", "3vh", "24vw", "28vh");
    setBlocStyles(blocRender, "8vw", "36vh", "92vw", "58vh");
}

function applyDispositionCodeLeft() {
    currentDisposition = "codeLeft";
    setBlocStyles(blocHtml, "9vw", "3vh", "35vw", "30vh");
    setBlocStyles(blocCss, "9vw", "35vh", "35vw", "30vh");
    setBlocStyles(blocJs, "9vw", "67vh", "35vw", "30vh");
    setBlocStyles(blocRender, "46vw", "3vh", "52vw", "94vh");
}

function closeWindow() {
    const templatesOverlay = document.getElementById("templatesOverlay");
    const modelOverlay = document.getElementById("modelOverlay");
    if (templatesOverlay) templatesOverlay.remove();
    if (modelOverlay) modelOverlay.remove();
}

// BOUTON RAFRAICHIR LES POSITIONS PAS DEFAUT

function reloadPage(){
    if (currentDisposition == "default") {
        applyDispositionDefault();
    } else if (currentDisposition == "grid") {
        applyDispositionGrid();
    } else if (currentDisposition == "topRow") {
        applyDispositionTopRow();
    } else {
        applyDispositionCodeLeft();
    }

}

// BOUTON POUR RESET LE LOCAL STORAGE

function storageClear(){
    localStorage.clear();
    document.getElementById("windowHtml").contentWindow.location.reload();
    document.getElementById("windowCss").contentWindow.location.reload();
    document.getElementById("windowJs").contentWindow.location.reload();
    document.getElementById("windowRender").contentWindow.location.reload();
}

// BOUTON POUR LA TAILLE DU MODEL

function toggleMini(button) {
    const bloc = button.closest(".bloc");
    const iframe = bloc.querySelector("iframe");

    if (!bloc.classList.contains("mini")) {
        bloc.dataset.oldTop = bloc.style.top || "";
        bloc.dataset.oldLeft = bloc.style.left || "";
        bloc.dataset.oldWidth = bloc.style.width || "";
        bloc.dataset.oldHeight = bloc.style.height || "";

        bloc.classList.add("mini");
        iframe.style.display = "none";

        bloc.style.position = "absolute";
        bloc.style.top = "97vh";
        bloc.style.left = "91vw";
        bloc.style.width = "8vw";
        bloc.style.height = "3vh";
        bloc.style.zIndex = 999999999;
    } else {
        bloc.classList.remove("mini");
        iframe.style.display = "";

        bloc.style.top = bloc.dataset.oldTop;
        bloc.style.left = bloc.dataset.oldLeft;
        bloc.style.width = bloc.dataset.oldWidth;
        bloc.style.height = bloc.dataset.oldHeight;
        bloc.style.zIndex = 10;
    }
}

// TEST SI LA SOURIS EST DANS LA ZONE

function isMouseInElement(mouseX, mouseY, element) {
    const rect = element.getBoundingClientRect();

    return (
        mouseX >= rect.left &&
        mouseX <= rect.right &&
        mouseY >= rect.top &&
        mouseY <= rect.bottom
    );
}

// FERMER LA FENETE MODELE

function closeModel(button) {
    const bloc = button.closest(".bloc");

    bloc.style.display = "none";
}


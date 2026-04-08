const timerDisplay = document.getElementById("timer");
const checkboxes = document.querySelectorAll(".step input");
const result = document.getElementById("result");

let time = 3600; // 1 heure en secondes
let finished = false;

function updateTimer() {
    let h = Math.floor(time / 3600);
    let m = Math.floor((time % 3600) / 60);
    let s = time % 60;

    timerDisplay.textContent =
        String(h).padStart(2, '0') + ":" +
        String(m).padStart(2, '0') + ":" +
        String(s).padStart(2, '0');

    
    if (time <= 60) {
        timerDisplay.style.background = "red";
    }

    if (time <= 0) {
        
        clearInterval(interval);
        finished = true;

        // bloquer tout
        checkboxes.forEach(cb => cb.disabled = true);
        document.body.classList.add("failed");
        result.textContent = "exercice raté";
    }

    time--;
}

const interval = setInterval(updateTimer, 1000);

checkboxes.forEach(cb => {
    cb.addEventListener("change", () => {

        if (finished) return;

        const allChecked = [...checkboxes].every(c => c.checked);

        if (allChecked) {
            clearInterval(interval);
            finished = true;
        
            checkboxes.forEach(c => c.disabled = true);
        
            document.body.classList.add("success");
        
            result.textContent = "exercice réussi";
            result.style.color = "#00c853";
        }
    });
});

require.config({
    paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs" }
});

require(["vs/editor/editor.main"], function () {
    window["editor"] = monaco.editor.create(document.getElementById("containerJs"), {
        value: localStorage.getItem("code_js") || "",
        language: "javascript",
        theme: "vs-dark",
        automaticLayout: true
    });

    window["editor"].onDidChangeModelContent(() => {
        localStorage.setItem("code_js", window["editor"].getValue());

        if (window.parent && typeof window.parent.updatePreviewDelayed === "function") {
            window.parent.updatePreviewDelayed();
        }
    });

    if (window.parent && typeof window.parent.updatePreviewDelayed === "function") {
        window.parent.updatePreviewDelayed();
    }
});
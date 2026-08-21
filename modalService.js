// js/services/modalService.js
// Sèvis jenerik pou kontwole modal (ranplase kòd repete nan chak modil)

const ModalService = (function () {
    function open({ title, bodyHtml, footerHtml = '' }) {
        document.getElementById('genericModalTitle').textContent = title;
        document.getElementById('genericModalBody').innerHTML = bodyHtml;
        document.getElementById('genericModalFooter').innerHTML = footerHtml;
        hideError();
        document.getElementById('genericModal').style.display = 'flex';
    }

    function close() {
        document.getElementById('genericModal').style.display = 'none';
    }

    function showError(message) {
        const errorBox = document.getElementById('genericModalError');
        errorBox.textContent = message;
        errorBox.style.display = 'block';
    }

    function hideError() {
        const errorBox = document.getElementById('genericModalError');
        errorBox.style.display = 'none';
        errorBox.textContent = '';
    }

    return { open, close, showError, hideError };
})();

window.ModalService = ModalService;

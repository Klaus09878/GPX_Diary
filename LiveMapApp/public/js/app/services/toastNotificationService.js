(function attachToastNotificationServiceFactory(globalScope) {
    function createToastNotificationService({ getToastSequence, setToastSequence, log }) {
        function ensureToastContainer() {
            let container = document.getElementById('toast-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'toast-container';
                container.className = 'toast-container';
                document.body.appendChild(container);
            }
            return container;
        }

        function dismissToast(toast, delayMs = 200) {
            if (!toast || !toast.parentElement) {
                return;
            }

            toast.classList.remove('is-visible');
            window.setTimeout(() => {
                if (toast.parentElement) {
                    toast.parentElement.removeChild(toast);
                }
            }, delayMs);
        }

        function showToast(message, type = 'info') {
            if (!message) {
                return;
            }

            const container = ensureToastContainer();
            const toast = document.createElement('div');
            const normalizedType = ['success', 'warning', 'error', 'info'].includes(type) ? type : 'info';
            const sequence = getToastSequence();
            setToastSequence(sequence + 1);

            toast.className = `app-toast app-toast--${normalizedType}`;
            toast.setAttribute('role', 'status');
            toast.dataset.toastId = `${Date.now()}-${sequence}`;

            const text = document.createElement('span');
            text.className = 'app-toast__text';
            text.textContent = message;

            const close = document.createElement('button');
            close.type = 'button';
            close.className = 'app-toast__close';
            close.setAttribute('aria-label', 'Meldung schließen');
            close.textContent = '×';
            close.onclick = () => dismissToast(toast);

            toast.appendChild(text);
            toast.appendChild(close);
            container.appendChild(toast);

            requestAnimationFrame(() => {
                toast.classList.add('is-visible');
            });

            window.setTimeout(() => dismissToast(toast), 4200);
            log(`[${normalizedType}] ${message}`);
        }

        return {
            ensureToastContainer,
            dismissToast,
            showToast
        };
    }

    globalScope.createToastNotificationService = createToastNotificationService;
})(window);

(function attachModalAccessibilityViewFactory(globalScope) {
    function createModalAccessibilityView({ modalFocusableSelector }) {
        let activeModalElement = null;
        let activeModalReturnFocusElement = null;
        let modalAccessibilityInitialized = false;

        function getModalFocusableElements(modal) {
            if (!modal) {
                return [];
            }

            return Array.from(modal.querySelectorAll(modalFocusableSelector)).filter(element => {
                if (!(element instanceof HTMLElement)) {
                    return false;
                }

                if (element.hasAttribute('disabled')) {
                    return false;
                }

                if (element.getAttribute('aria-hidden') === 'true') {
                    return false;
                }

                return element.offsetParent !== null || element === document.activeElement;
            });
        }

        function trapFocusInModal(modal, event) {
            const focusableElements = getModalFocusableElements(modal);
            if (!focusableElements.length) {
                event.preventDefault();
                const fallbackTarget = modal.querySelector('.modal-content') || modal;
                if (fallbackTarget instanceof HTMLElement) {
                    fallbackTarget.focus({ preventScroll: true });
                }
                return;
            }

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            const activeElement = document.activeElement;

            if (event.shiftKey) {
                if (activeElement === firstElement || !modal.contains(activeElement)) {
                    event.preventDefault();
                    lastElement.focus({ preventScroll: true });
                }
                return;
            }

            if (activeElement === lastElement || !modal.contains(activeElement)) {
                event.preventDefault();
                firstElement.focus({ preventScroll: true });
            }
        }

        function prepareModalForA11y(modal) {
            if (!modal) {
                return;
            }

            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            if (!modal.hasAttribute('aria-hidden')) {
                modal.setAttribute('aria-hidden', 'true');
            }

            const content = modal.querySelector('.modal-content');
            if (content instanceof HTMLElement && !content.hasAttribute('tabindex')) {
                content.setAttribute('tabindex', '-1');
            }
        }

        function isModalOpen(modal) {
            return Boolean(modal) && (modal.classList.contains('is-open') || modal.style.display === 'flex');
        }

        function openModalWithA11y(modal, { returnFocusEl = null, initialFocusSelector = '.close-btn' } = {}) {
            if (!modal) {
                return;
            }

            prepareModalForA11y(modal);

            if (activeModalElement && activeModalElement !== modal) {
                closeModalWithA11y(activeModalElement, { skipFocusRestore: true });
            }

            const focusSource = returnFocusEl instanceof HTMLElement ? returnFocusEl : document.activeElement;
            if (focusSource instanceof HTMLElement) {
                activeModalReturnFocusElement = focusSource;
            }

            modal.style.display = 'flex';
            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
            activeModalElement = modal;

            const preferredFocus = initialFocusSelector ? modal.querySelector(initialFocusSelector) : null;
            const focusTarget = preferredFocus instanceof HTMLElement
                ? preferredFocus
                : (modal.querySelector('.modal-content') || modal);

            if (focusTarget instanceof HTMLElement) {
                window.setTimeout(() => {
                    if (activeModalElement === modal) {
                        focusTarget.focus({ preventScroll: true });
                    }
                }, 0);
            }
        }

        function closeModalWithA11y(modal, { skipFocusRestore = false } = {}) {
            if (!modal) {
                return;
            }

            modal.classList.remove('is-open');
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');

            if (activeModalElement !== modal) {
                return;
            }

            activeModalElement = null;
            const restoreTarget = activeModalReturnFocusElement;
            activeModalReturnFocusElement = null;

            if (skipFocusRestore) {
                return;
            }

            if (restoreTarget instanceof HTMLElement && document.contains(restoreTarget)) {
                window.setTimeout(() => {
                    restoreTarget.focus({ preventScroll: true });
                }, 0);
            }
        }

        function initModalAccessibility() {
            if (modalAccessibilityInitialized) {
                return;
            }

            modalAccessibilityInitialized = true;
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                prepareModalForA11y(modal);
            });

            document.addEventListener('keydown', (event) => {
                const modal = activeModalElement;
                if (!modal || !isModalOpen(modal)) {
                    return;
                }

                if (event.key === 'Escape') {
                    event.preventDefault();
                    closeModalWithA11y(modal);
                    return;
                }

                if (event.key === 'Tab') {
                    trapFocusInModal(modal, event);
                }
            });
        }

        function initStandardModal({ modalId, triggerId, closeId, initialFocusSelector = '.close-btn', onOpen = null } = {}) {
            const modal = document.getElementById(modalId);
            if (!modal) {
                return;
            }

            prepareModalForA11y(modal);

            const triggerButton = triggerId ? document.getElementById(triggerId) : null;
            const closeButton = closeId ? document.getElementById(closeId) : null;

            if (triggerButton) {
                triggerButton.onclick = async () => {
                    openModalWithA11y(modal, {
                        returnFocusEl: triggerButton,
                        initialFocusSelector
                    });

                    if (typeof onOpen === 'function') {
                        try {
                            await onOpen();
                        } catch (error) {
                            console.error(error);
                        }
                    }
                };
            }

            if (closeButton) {
                closeButton.onclick = () => {
                    closeModalWithA11y(modal);
                };
            }

            modal.onclick = (event) => {
                if (event.target === modal) {
                    closeModalWithA11y(modal);
                }
            };
        }

        return {
            openModalWithA11y,
            closeModalWithA11y,
            initModalAccessibility,
            initStandardModal
        };
    }

    globalScope.createModalAccessibilityView = createModalAccessibilityView;
})(window);

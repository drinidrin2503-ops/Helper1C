document.querySelectorAll(".alert").forEach((alert) => {
    window.setTimeout(() => {
        alert.style.opacity = "0";
        alert.style.transition = "opacity .3s ease";
        window.setTimeout(() => alert.remove(), 300);
    }, 4500);
});

const sectionSearch = document.querySelector("[data-section-search]");

if (sectionSearch) {
    const openButton = sectionSearch.querySelector("[data-section-search-open]");
    const closeButton = sectionSearch.querySelector("[data-section-search-close]");
    const searchForm = sectionSearch.querySelector(".section-search-form");
    const firstInput = searchForm.querySelector('input[name="q"]');

    const openSearch = () => {
        sectionSearch.classList.add("is-open");
        searchForm.classList.add("is-open");
        openButton.setAttribute("aria-expanded", "true");
        window.setTimeout(() => firstInput.focus(), 250);
    };

    const closeSearch = () => {
        sectionSearch.classList.remove("is-open");
        searchForm.classList.remove("is-open");
        openButton.setAttribute("aria-expanded", "false");
        sectionSearch.focus();
    };

    if (searchForm.classList.contains("is-open")) {
        sectionSearch.classList.add("is-open");
    }

    openButton.addEventListener("click", openSearch);
    closeButton.addEventListener("click", closeSearch);
    sectionSearch.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && searchForm.classList.contains("is-open")) {
            closeSearch();
        }
    });
}

const modalBackdrop = document.querySelector("[data-modal-backdrop]");
const modalCards = document.querySelectorAll("[data-card-modal]");

if (modalBackdrop) {
    const modalName = modalBackdrop.querySelector("[data-modal-name]");
    const modalSection = modalBackdrop.querySelector("[data-modal-section]");
    const modalCardNumber = modalBackdrop.querySelector("[data-modal-card-number]");
    const modalShortDescription = modalBackdrop.querySelector("[data-modal-short-description]");
    const modalDescription = modalBackdrop.querySelector("[data-modal-description]");
    const modalFavoriteForm = modalBackdrop.querySelector("[data-modal-favorite-form]");
    const modalFavoriteButton = modalBackdrop.querySelector("[data-modal-favorite-button]");
    const modalFavoriteStatus = modalBackdrop.querySelector("[data-modal-favorite-status]");
    const commentsPanel = modalBackdrop.querySelector("[data-comments-list]");
    const commentsStatus = modalBackdrop.querySelector("[data-comments-status]");
    const commentForm = modalBackdrop.querySelector("[data-comment-form]");
    const commentInput = commentForm ? commentForm.querySelector("textarea") : null;
    let commentsRequestId = 0;
    let activeCard = null;

    const formatCommentDate = (value) => {
        const date = new Date(`${value.replace(" ", "T")}Z`);
        return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ru-RU");
    };

    const renderComment = (comment) => {
        const item = document.createElement("article");
        item.className = "comment-item";

        const heading = document.createElement("div");
        heading.className = "comment-heading";
        const author = document.createElement("strong");
        author.className = "comment-author";
        author.textContent = comment.username;
        const date = document.createElement("time");
        date.className = "comment-date";
        date.textContent = formatCommentDate(comment.created_at);
        heading.append(author, date);

        const content = document.createElement("p");
        content.className = "comment-content";
        content.textContent = comment.content;
        item.append(heading, content);
        return item;
    };

    const loadComments = async (cardId) => {
        const requestId = ++commentsRequestId;
        commentsPanel.replaceChildren();
        commentsStatus.textContent = "Загрузка комментариев...";

        try {
            const response = await fetch(`/cards/${encodeURIComponent(cardId)}/comments`, {
                credentials: "same-origin",
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || "Не удалось загрузить комментарии.");
            }
            if (requestId !== commentsRequestId) {
                return;
            }

            result.comments.forEach((comment) => commentsPanel.append(renderComment(comment)));
            commentsStatus.textContent = result.comments.length
                ? ""
                : "Комментариев пока нет.";
        } catch (error) {
            if (requestId === commentsRequestId) {
                console.error("Не удалось загрузить комментарии:", error);
                commentsStatus.textContent = error.message;
            }
        }
    };

    const closeModal = () => {
        modalBackdrop.hidden = true;
        document.body.classList.remove("modal-open");
    };

    const openModal = (card) => {
        activeCard = card;
        modalName.textContent = card.dataset.cardName;
        modalSection.textContent = `${card.dataset.cardSection} - ${card.dataset.cardName} - подробная информация`;
        modalCardNumber.textContent = `${card.dataset.cardNumberLabel || "Карточка"} #${card.dataset.cardId}`;
        modalShortDescription.textContent = card.dataset.cardShortDescription;
        modalDescription.innerHTML = card.dataset.cardDescription;
        if (commentForm) {
            commentForm.action = `/cards/${encodeURIComponent(card.dataset.cardId)}/comments`;
            commentInput.value = "";
            loadComments(card.dataset.cardId);
        }
        if (modalFavoriteForm) {
            modalFavoriteForm.action = card.dataset.cardFavoriteAction;
            const isFavorite = card.dataset.cardIsFavorite === "true";
            modalFavoriteButton.classList.toggle("active", isFavorite);
            const favoriteLabel = isFavorite ? "Убрать из избранного" : "Добавить в избранное";
            modalFavoriteButton.setAttribute("aria-label", favoriteLabel);
            modalFavoriteButton.title = favoriteLabel;
            modalFavoriteStatus.hidden = true;
            modalFavoriteStatus.textContent = "";
        }
        modalBackdrop.hidden = false;
        document.body.classList.add("modal-open");
        modalBackdrop.querySelector("[data-modal-close]").focus();
    };

    if (commentForm) {
        commentForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const submittedCardId = activeCard.dataset.cardId;
            const submitButton = commentForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            commentsStatus.textContent = "";

            try {
                const response = await fetch(`/cards/${encodeURIComponent(submittedCardId)}/comments`, {
                    method: "POST",
                    body: new FormData(commentForm),
                    credentials: "same-origin",
                });
                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || "Не удалось отправить комментарий.");
                }

                if (activeCard.dataset.cardId === submittedCardId) {
                    commentsPanel.append(renderComment(result));
                    commentsPanel.scrollTop = commentsPanel.scrollHeight;
                    commentsStatus.textContent = "";
                }
                commentInput.value = "";
            } catch (error) {
                console.error("Не удалось отправить комментарий:", error);
                if (activeCard.dataset.cardId === submittedCardId) {
                    commentsStatus.textContent = error.message;
                }
            } finally {
                submitButton.disabled = false;
            }
        });
    }

    if (modalFavoriteForm) {
        modalFavoriteForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            modalFavoriteButton.disabled = true;
            modalFavoriteStatus.hidden = true;
            modalFavoriteStatus.textContent = "";

            try {
                const response = await fetch(modalFavoriteForm.action, {
                    method: "POST",
                    headers: { "X-Requested-With": "XMLHttpRequest" },
                    credentials: "same-origin",
                });
                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || "Не удалось изменить избранное.");
                }

                const favoriteLabel = result.is_favorite
                    ? "Убрать из избранного"
                    : "Добавить в избранное";
                modalFavoriteButton.classList.toggle("active", result.is_favorite);
                modalFavoriteButton.setAttribute("aria-label", favoriteLabel);
                modalFavoriteButton.title = favoriteLabel;
                if (activeCard) {
                    activeCard.dataset.cardIsFavorite = String(result.is_favorite);
                }
            } catch (error) {
                console.error("Не удалось обновить избранное:", error);
                modalFavoriteStatus.textContent = error.message;
                modalFavoriteStatus.hidden = false;
            } finally {
                modalFavoriteButton.disabled = false;
            }
        });
    }

    modalCards.forEach((card) => {
        card.addEventListener("click", (event) => {
            if (!event.target.closest("a, button")) {
                openModal(card);
            }
        });
        card.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openModal(card);
            }
        });
    });

    modalBackdrop.addEventListener("click", (event) => {
        if (event.target === modalBackdrop || event.target.closest("[data-modal-close]")) {
            closeModal();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !modalBackdrop.hidden) {
            closeModal();
        }
    });
}

const deleteBackdrop = document.querySelector("[data-delete-backdrop]");
const deleteForms = document.querySelectorAll("[data-delete-form]");

if (deleteBackdrop) {
    const deleteName = deleteBackdrop.querySelector("[data-delete-name]");
    const deleteConfirm = deleteBackdrop.querySelector("[data-delete-confirm]");
    const deleteCancel = deleteBackdrop.querySelector("[data-delete-cancel]");
    let pendingDeleteForm = null;

    const closeDeleteModal = () => {
        deleteBackdrop.hidden = true;
        pendingDeleteForm = null;
        document.body.classList.remove("modal-open");
    };

    deleteForms.forEach((form) => {
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            pendingDeleteForm = form;
            deleteName.textContent = form.querySelector("[data-delete-trigger]").dataset.cardName;
            deleteBackdrop.hidden = false;
            document.body.classList.add("modal-open");
            deleteCancel.focus();
        });
    });

    deleteConfirm.addEventListener("click", () => {
        if (pendingDeleteForm) {
            pendingDeleteForm.submit();
        }
    });
    deleteCancel.addEventListener("click", closeDeleteModal);
    deleteBackdrop.addEventListener("click", (event) => {
        if (event.target === deleteBackdrop) {
            closeDeleteModal();
        }
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !deleteBackdrop.hidden) {
            closeDeleteModal();
        }
    });
}

const proposalBackdrop = document.querySelector("[data-proposal-backdrop]");
const proposalConfirmBackdrop = document.querySelector("[data-proposal-confirm-backdrop]");
const proposalOpenButtons = document.querySelectorAll("[data-proposal-open]");
const proposalForm = document.querySelector("[data-proposal-form]");

if (proposalBackdrop && proposalConfirmBackdrop && proposalForm) {
    let proposalConfirmed = false;

    const closeProposalModal = () => {
        proposalBackdrop.hidden = true;
        document.body.classList.remove("modal-open");
    };

    const closeProposalConfirm = () => {
        proposalConfirmBackdrop.hidden = true;
        document.body.classList.remove("modal-open");
    };

    proposalOpenButtons.forEach((button) => {
        button.addEventListener("click", () => {
            proposalBackdrop.hidden = false;
            document.body.classList.add("modal-open");
            proposalBackdrop.querySelector("input").focus();
        });
    });

    proposalBackdrop.addEventListener("click", (event) => {
        if (event.target === proposalBackdrop || event.target.closest("[data-proposal-close]")) {
            closeProposalModal();
        }
    });

    proposalForm.addEventListener("submit", (event) => {
        if (!proposalConfirmed) {
            event.preventDefault();
            proposalConfirmBackdrop.hidden = false;
            document.body.classList.add("modal-open");
            proposalConfirmBackdrop.querySelector("[data-proposal-confirm-cancel]").focus();
        }
    });

    proposalConfirmBackdrop.querySelector("[data-proposal-confirm-submit]").addEventListener("click", () => {
        proposalConfirmed = true;
        proposalForm.submit();
    });
    proposalConfirmBackdrop.querySelector("[data-proposal-confirm-cancel]").addEventListener("click", closeProposalConfirm);
    proposalConfirmBackdrop.addEventListener("click", (event) => {
        if (event.target === proposalConfirmBackdrop) {
            closeProposalConfirm();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            if (!proposalConfirmBackdrop.hidden) {
                closeProposalConfirm();
            } else if (!proposalBackdrop.hidden) {
                closeProposalModal();
            }
        }
    });
}

const decisionBackdrop = document.querySelector("[data-decision-backdrop]");
const decisionForms = document.querySelectorAll("[data-decision-form]");

if (decisionBackdrop) {
    const decisionTitle = decisionBackdrop.querySelector("[data-decision-title]");
    const decisionName = decisionBackdrop.querySelector("[data-decision-name]");
    const decisionConfirm = decisionBackdrop.querySelector("[data-decision-confirm]");
    const decisionCancel = decisionBackdrop.querySelector("[data-decision-cancel]");
    let pendingDecisionForm = null;

    const closeDecisionModal = () => {
        decisionBackdrop.hidden = true;
        pendingDecisionForm = null;
        document.body.classList.remove("modal-open");
    };

    decisionForms.forEach((form) => {
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            pendingDecisionForm = form;
            const decision = form.dataset.decision;
            decisionTitle.textContent = `${decision.charAt(0).toUpperCase()}${decision.slice(1)} предложение?`;
            decisionName.textContent = form.dataset.proposalName;
            decisionBackdrop.hidden = false;
            document.body.classList.add("modal-open");
            decisionCancel.focus();
        });
    });

    decisionConfirm.addEventListener("click", () => {
        if (pendingDecisionForm) {
            pendingDecisionForm.submit();
        }
    });
    decisionCancel.addEventListener("click", closeDecisionModal);
    decisionBackdrop.addEventListener("click", (event) => {
        if (event.target === decisionBackdrop) {
            closeDecisionModal();
        }
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !decisionBackdrop.hidden) {
            closeDecisionModal();
        }
    });
}

const newsBackdrop = document.querySelector("[data-news-backdrop]");
const newsCards = document.querySelectorAll("[data-news-modal]");

if (newsBackdrop) {
    const newsTitle = newsBackdrop.querySelector("[data-news-modal-title]");
    const newsDate = newsBackdrop.querySelector("[data-news-modal-date]");
    const newsShort = newsBackdrop.querySelector("[data-news-modal-short]");
    const newsContent = newsBackdrop.querySelector("[data-news-modal-content]");

    const closeNewsModal = () => {
        newsBackdrop.hidden = true;
        document.body.classList.remove("modal-open");
    };

    newsCards.forEach((card) => {
        const openNewsModal = () => {
            newsTitle.textContent = card.dataset.newsTitle;
            newsDate.textContent = card.dataset.newsDate;
            newsShort.textContent = card.dataset.newsShort;
            newsContent.innerHTML = card.dataset.newsContent;
            newsBackdrop.hidden = false;
            document.body.classList.add("modal-open");
            newsBackdrop.querySelector("[data-news-close]").focus();
        };

        card.addEventListener("click", (event) => {
            if (!event.target.closest("a, button")) {
                openNewsModal();
            }
        });
        card.addEventListener("keydown", (event) => {
            if ((event.key === "Enter" || event.key === " ") && !event.target.closest("a, button")) {
                event.preventDefault();
                openNewsModal();
            }
        });
    });

    newsBackdrop.addEventListener("click", (event) => {
        if (event.target === newsBackdrop || event.target.closest("[data-news-close]")) {
            closeNewsModal();
        }
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !newsBackdrop.hidden) {
            closeNewsModal();
        }
    });
}

document.querySelectorAll("[data-rich-editor]").forEach((editor) => {
    const content = editor.querySelector(".editor-content");
    const value = editor.querySelector(".editor-value");
    const form = editor.closest("form");

    content.innerHTML = value.value;

    editor.querySelectorAll("[data-command]").forEach((button) => {
        button.addEventListener("mousedown", (event) => event.preventDefault());
        button.addEventListener("click", () => {
            content.focus();
            if (button.dataset.command === "createLink") {
                const url = window.prompt("Введите адрес ссылки:");
                if (url) {
                    document.execCommand("createLink", false, url);
                }
                return;
            }
            document.execCommand(button.dataset.command, false, null);
        });
    });

    editor.querySelectorAll("[data-color-command]").forEach((input) => {
        input.addEventListener("input", () => {
            content.focus();
            document.execCommand(input.dataset.colorCommand, false, input.value);
        });
    });

    form.addEventListener("submit", (event) => {
        const html = content.innerHTML.trim();
        const plainText = content.textContent.trim();
        value.value = html;
        if (content.hasAttribute("data-rich-required") && !plainText) {
            event.preventDefault();
            content.classList.add("editor-invalid");
            content.focus();
        } else {
            content.classList.remove("editor-invalid");
        }
    });

    content.addEventListener("input", () => {
        if (content.textContent.trim()) {
            content.classList.remove("editor-invalid");
        }
    });
});

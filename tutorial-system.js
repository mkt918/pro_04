// ===== チュートリアルシステム v1.0 (2026-02-09) =====

class TutorialSystem {
    constructor() {
        this.currentStep = 0;
        this.steps = [];
        this.tutorialActive = false;
    }

    // チュートリアルを読み込んで開始
    async loadTutorial(tutorialId) {
        try {
            const response = await fetch(`tutorials/${tutorialId}.json`);
            if (!response.ok) {
                throw new Error(`チュートリアルが見つかりません: ${tutorialId}`);
            }

            const tutorialData = await response.json();
            this.steps = tutorialData.steps;
            this.currentStep = 0;
            this.tutorialActive = true;

            this.showStep(0);
            return tutorialData;
        } catch (error) {
            console.error('チュートリアルの読み込みに失敗:', error);
            showConsoleMessage(`チュートリアルの読み込みに失敗しました: ${error.message}`, 'error');
            return null;
        }
    }

    // ステップを表示
    showStep(index) {
        if (index < 0 || index >= this.steps.length) return;

        const step = this.steps[index];
        this.currentStep = index;

        // チュートリアルパネルを表示
        const panel = document.getElementById('tutorialPanel');
        if (!panel) {
            this.createTutorialPanel();
        }

        this.updateTutorialPanel(step);

        // 特定のブロックをハイライト
        if (step.highlightBlock) {
            this.highlightBlock(step.highlightBlock);
        }
    }

    // チュートリアルパネルを作成
    createTutorialPanel() {
        const panelHTML = `
            <div id="tutorialPanel" class="tutorial-panel">
                <div class="tutorial-header">
                    <h3>📚 チュートリアル</h3>
                    <button id="closeTutorialPanel" class="btn-close">✕</button>
                </div>
                <div class="tutorial-content">
                    <div id="tutorialStepContent"></div>
                </div>
                <div class="tutorial-navigation">
                    <button id="prevStepBtn" class="btn btn-secondary">← 前へ</button>
                    <span id="tutorialProgress">1 / 1</span>
                    <button id="nextStepBtn" class="btn btn-run">次へ →</button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', panelHTML);

        // イベントリスナーを設定
        document.getElementById('closeTutorialPanel')?.addEventListener('click', () => {
            this.closeTutorial();
        });

        document.getElementById('prevStepBtn')?.addEventListener('click', () => {
            this.previousStep();
        });

        document.getElementById('nextStepBtn')?.addEventListener('click', () => {
            this.nextStep();
        });
    }

    // チュートリアルパネルを更新
    updateTutorialPanel(step) {
        const panel = document.getElementById('tutorialPanel');
        if (!panel) return;

        panel.style.display = 'block';

        const contentDiv = document.getElementById('tutorialStepContent');
        if (contentDiv) {
            contentDiv.innerHTML = `
                <h4>${step.title}</h4>
                <p>${step.description}</p>
                ${step.image ? `<img src="${step.image}" alt="${step.title}" style="max-width: 100%; border-radius: 8px; margin-top: 1rem;">` : ''}
            `;
        }

        const progressSpan = document.getElementById('tutorialProgress');
        if (progressSpan) {
            progressSpan.textContent = `${this.currentStep + 1} / ${this.steps.length}`;
        }

        // ボタンの有効/無効を設定
        const prevBtn = document.getElementById('prevStepBtn');
        const nextBtn = document.getElementById('nextStepBtn');

        if (prevBtn) {
            prevBtn.disabled = this.currentStep === 0;
        }

        if (nextBtn) {
            if (this.currentStep === this.steps.length - 1) {
                nextBtn.textContent = '完了';
            } else {
                nextBtn.textContent = '次へ →';
            }
        }
    }

    // ブロックをハイライト
    highlightBlock(blockType) {
        // すべてのハイライトを削除
        document.querySelectorAll('.block-template').forEach(block => {
            block.classList.remove('tutorial-highlight');
        });

        // 指定されたブロックをハイライト
        const targetBlock = document.querySelector(`.block-template[data-type="${blockType}"]`);
        if (targetBlock) {
            targetBlock.classList.add('tutorial-highlight');
            targetBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // 次のステップへ
    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.showStep(this.currentStep + 1);
        } else {
            this.completeTutorial();
        }
    }

    // 前のステップへ
    previousStep() {
        if (this.currentStep > 0) {
            this.showStep(this.currentStep - 1);
        }
    }

    // チュートリアルを完了
    completeTutorial() {
        this.tutorialActive = false;
        showConsoleMessage('チュートリアルを完了しました！🎉', 'success');
        this.closeTutorial();
    }

    // チュートリアルを閉じる
    closeTutorial() {
        const panel = document.getElementById('tutorialPanel');
        if (panel) {
            panel.style.display = 'none';
        }

        // ハイライトを削除
        document.querySelectorAll('.block-template').forEach(block => {
            block.classList.remove('tutorial-highlight');
        });

        this.tutorialActive = false;
    }
}

// グローバルインスタンス
let tutorialSystem = null;

// 初期化
function initTutorialSystem() {
    tutorialSystem = new TutorialSystem();
}

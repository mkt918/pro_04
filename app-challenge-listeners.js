
// チャレンジシステムのイベントリスナー
function initChallengeListeners() {
    const loadChallengeBtn = document.getElementById('loadChallengeBtn');
    const challengeModal = document.getElementById('challengeModal');
    const closeChallengeModal = document.getElementById('closeChallengeModal');
    const challengeItems = document.querySelectorAll('.challenge-item');

    // 課題ボタンをクリック
    if (loadChallengeBtn) {
        loadChallengeBtn.addEventListener('click', () => {
            if (challengeModal) {
                challengeModal.style.display = 'flex';
            }
        });
    }

    // モーダルを閉じる
    if (closeChallengeModal) {
        closeChallengeModal.addEventListener('click', () => {
            if (challengeModal) {
                challengeModal.style.display = 'none';
            }
        });
    }

    // 課題を選択
    challengeItems.forEach(item => {
        item.addEventListener('click', async function () {
            const challengeId = this.dataset.challenge;
            if (challengeSystem && challengeId) {
                await challengeSystem.loadChallenge(challengeId);
                if (challengeModal) {
                    challengeModal.style.display = 'none';
                }
            }
        });
    });

    // モーダルの外側をクリックで閉じる
    if (challengeModal) {
        challengeModal.addEventListener('click', (e) => {
            if (e.target === challengeModal) {
                challengeModal.style.display = 'none';
            }
        });
    }
}

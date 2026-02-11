
// クエストシステムのイベントリスナー
function initChallengeListeners() {
    const loadQuestBtn = document.getElementById('loadQuestBtn');
    const questModal = document.getElementById('questModal');
    const closeQuestModal = document.getElementById('closeQuestModal');
    const questItems = document.querySelectorAll('.quest-item');

    // クエストボタンをクリック
    if (loadQuestBtn) {
        loadQuestBtn.addEventListener('click', () => {
            if (questModal) {
                questModal.style.display = 'flex';
            }
        });
    }

    // モーダルを閉じる
    if (closeQuestModal) {
        closeQuestModal.addEventListener('click', () => {
            if (questModal) {
                questModal.style.display = 'none';
            }
        });
    }

    // クエストを選択
    questItems.forEach(item => {
        item.addEventListener('click', async function () {
            const questId = this.dataset.quest;
            if (challengeSystem && questId) {
                await challengeSystem.loadChallenge(questId);
                if (questModal) {
                    questModal.style.display = 'none';
                }
            }
        });
    });

    // モーダルの外側をクリックで閉じる
    if (questModal) {
        questModal.addEventListener('click', (e) => {
            if (e.target === questModal) {
                questModal.style.display = 'none';
            }
        });
    }
}

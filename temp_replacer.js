// マニュアルステップ実行（特定のステップまで実行して止める）
async function executeManualStep(code, targetStepIndex) {
    if (!turtleSim) {
        initTurtleSimulator();
    }

    const lines = code.split('\n').filter(line => line.trim() !== '');

    // turtleSimの内部状態をリセットしつつ、ステップ実行モードであることを示す
    turtleSim.currentBlockIndex = 0;
    turtleSim.errorBlockIndex = undefined;
    turtleSim.breakFlag = false;

    // 再帰的にブロックを実行
    await executeBlock(lines, 0, 0, lines.length, targetStepIndex);
}

// ブロック実行関数
async function executeBlock(lines, startIndex, baseIndent, endIndex, targetStepIndex = -1) {
    let i = startIndex;

    while (i < endIndex) {
        // 停止ボタンやエラーでの中断
        if (turtleSim && (turtleSim.hasError || turtleSim.breakFlag)) break;

        const line = lines[i];
        const trimmed = line.trim();

        if (trimmed === '' || trimmed.startsWith('#')) {
            i++;
            continue;
        }

        const currentIndent = line.search(/\S/);
        if (currentIndent < baseIndent) break;

        // --- メタデータからハイライトとステップ更新を行う ---
        const metaMatch = line.match(/# @idx:(\d+)/);
        let blockIdx = -1;
        if (metaMatch) {
            blockIdx = parseInt(metaMatch[1]);

            // ステップ実行モードの場合、目標のインデックスを超えたら停止
            if (targetStepIndex !== -1 && blockIdx > targetStepIndex) {
                return;
            }

            // 実行中のブロックを強調表示
            if (typeof highlightActiveBlock === 'function') {
                highlightActiveBlock(blockIdx);
            }

            if (turtleSim) {
                turtleSim.stepCount++;
                turtleSim.updateStepDisplay();
                turtleSim.currentBlockIndex = blockIdx;
            }
        }

        // --- break 処理 ---
        if (trimmed === 'break') {
            if (turtleSim) turtleSim.breakFlag = true;
            i++;
            break;
        }

        // --- while (until) 処理 ---
        if (trimmed.startsWith('while ')) {
            const match = trimmed.match(/while\s+(.+):/);
            if (!match) {
                throw new Error(`while文の構文エラー: ${trimmed}`);
            }
            const conditionExpr = match[1];
            const blockRange = findBlockRange(lines, i, endIndex);

            while (evaluateExpression(conditionExpr)) {
                await executeBlock(lines, blockRange.start, blockRange.indent, blockRange.end, targetStepIndex);
                if (turtleSim && (turtleSim.hasError || turtleSim.breakFlag)) break;
            }
            // ループを抜けた際に breakFlag をリセット（この外側のループには影響させない）
            if (turtleSim && turtleSim.breakFlag) {
                turtleSim.breakFlag = false;
            }
            i = blockRange.end;
            continue;
        }

        // --- for 処理 (旧互換) ---
        if (trimmed.startsWith('for ')) {
            const match = trimmed.match(/range\((\d+)\)/);
            if (match) {
                const loopCount = parseInt(match[1]);
                const blockRange = findBlockRange(lines, i, endIndex);
                for (let c = 0; c < loopCount; c++) {
                    await executeBlock(lines, blockRange.start, blockRange.indent, blockRange.end, targetStepIndex);
                    if (turtleSim && (turtleSim.hasError || turtleSim.breakFlag)) break;
                }
                if (turtleSim && turtleSim.breakFlag) turtleSim.breakFlag = false;
                i = blockRange.end;
                continue;
            }
        }

        // --- if / else 処理 ---
        if (trimmed.startsWith('if ')) {
            const match = trimmed.match(/if\s+(.+):/);
            if (!match) {
                throw new Error(`if文の構文エラー: ${trimmed}`);
            }
            const conditionExpr = match[1];
            const ifRange = findBlockRange(lines, i, endIndex);

            // else の範囲を探す
            let elseRange = null;
            if (ifRange.end < endIndex) {
                const nextLine = lines[ifRange.end].trim();
                if (nextLine === 'else:') {
                    elseRange = findBlockRange(lines, ifRange.end, endIndex);
                }
            }

            if (evaluateExpression(conditionExpr)) {
                await executeBlock(lines, ifRange.start, ifRange.indent, ifRange.end, targetStepIndex);
            } else if (elseRange) {
                await executeBlock(lines, elseRange.start, elseRange.indent, elseRange.end, targetStepIndex);
            }

            // 停止チェック
            if (turtleSim && (turtleSim.hasError || turtleSim.breakFlag)) break;

            // ステップモードでない場合のみ待機
            if (targetStepIndex === -1) {
                await turtleSim.sleep(turtleSim.speed);
            }

            i = elseRange ? elseRange.end : ifRange.end;
            continue;
        }

        // 通常コマンドの実行
        await executeCommand(trimmed);

        // コマンド実行後に速度設定に応じた待機を入れる
        if (!trimmed.startsWith('#') && turtleSim && targetStepIndex === -1) {
            await turtleSim.sleep(turtleSim.speed);
        }

        i++;
    }
}

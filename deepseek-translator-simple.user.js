// ==UserScript==
// @name         DeepSeek 翻译助手 - 简化版
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  简单易用的网页翻译工具，支持全局翻译和划词翻译
// @author       您的名字
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @connect      api.deepseek.com
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // ========================================
    // 🔧 配置区域 - 在这里填入您的API Key
    // ========================================
    const CONFIG = {
        // 👇 请在下面的单引号内填入您的 DeepSeek API Key
        API_KEY: 'sk-fdc6b68f14d14138999874e046f031ec',  // 格式: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxx'
        
        // 其他配置
        TARGET_LANGUAGE: 'zh',  // 目标语言: zh=中文, en=英文, ja=日文, ko=韩文
        AUTO_TRANSLATE: false,  // 是否自动翻译选中的文本
        BUTTON_POSITION: { x: 50, y: 50 }  // 悬浮球初始位置
    };

    // ========================================
    // 核心翻译功能
    // ========================================
    class SimpleTranslator {
        constructor() {
            // 检查是否已经有实例存在
            if (window.deepseekTranslatorInstance) {
                console.log('⏭️ 翻译器实例已存在，跳过重复创建');
                return window.deepseekTranslatorInstance;
            }
            
            this.isGlobalMode = false;
            this.isSelectionMode = true;
            this.selectedText = '';
            
            // 标记实例已创建
            window.deepseekTranslatorInstance = this;
            
            this.init();
        }

        init() {
            console.log('🚀 SimpleTranslator 开始初始化...');
            
            // 按顺序初始化各个组件
            try {
                this.createStyles();
                console.log('✅ 样式已创建');
                
                // 延迟创建悬浮球，确保样式已应用
                setTimeout(() => {
                    this.createFloatingBall();
                }, 100);
                
                this.createTranslatePanel();
                console.log('✅ 翻译面板已创建');
                
                this.bindEvents();
                console.log('✅ 事件已绑定');
                
                console.log('🎉 SimpleTranslator 初始化完成');
            } catch (error) {
                console.error('❌ SimpleTranslator 初始化失败:', error);
            }
        }

        // 创建样式
        createStyles() {
            console.log('🎨 开始创建样式...');
            const style = document.createElement('style');
            style.id = 'deepseek-translator-styles';
            style.textContent = `
                /* 悬浮球样式 */
                .ds-float-ball {
                    position: fixed !important;
                    width: 50px !important;
                    height: 50px !important;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                    border: none !important;
                    border-radius: 50% !important;
                    color: white !important;
                    font-size: 18px !important;
                    font-weight: bold !important;
                    cursor: move !important;
                    z-index: 999999 !important;
                    box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4) !important;
                    transition: all 0.3s ease !important;
                    user-select: none !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                }

                .ds-float-ball:hover {
                    transform: scale(1.1) !important;
                    box-shadow: 0 6px 25px rgba(102, 126, 234, 0.6) !important;
                }

                .ds-float-ball.dragging {
                    transform: scale(1.05) !important;
                    box-shadow: 0 8px 30px rgba(102, 126, 234, 0.8) !important;
                }

                /* 翻译面板样式 */
                .ds-translate-panel {
                    position: fixed !important;
                    top: 50% !important;
                    left: 50% !important;
                    transform: translate(-50%, -50%) !important;
                    width: 600px !important;
                    max-width: 90vw !important;
                    background: white !important;
                    border-radius: 12px !important;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3) !important;
                    z-index: 1000000 !important;
                    display: none !important;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                    overflow: hidden !important;
                }

                .ds-panel-header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                    color: white !important;
                    padding: 15px 20px !important;
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                }

                .ds-panel-title {
                    font-size: 16px !important;
                    font-weight: 600 !important;
                    margin: 0 !important;
                }

                .ds-panel-controls {
                    display: flex !important;
                    gap: 10px !important;
                }

                .ds-control-btn {
                    background: rgba(255,255,255,0.2) !important;
                    border: none !important;
                    color: white !important;
                    padding: 5px 12px !important;
                    border-radius: 6px !important;
                    cursor: pointer !important;
                    font-size: 12px !important;
                    transition: all 0.2s !important;
                }

                .ds-control-btn:hover {
                    background: rgba(255,255,255,0.3) !important;
                }

                .ds-control-btn.active {
                    background: rgba(255,255,255,0.4) !important;
                }

                .ds-panel-body {
                    padding: 20px !important;
                }

                .ds-textarea {
                    width: 100% !important;
                    min-height: 120px !important;
                    border: 2px solid #e1e1e1 !important;
                    border-radius: 8px !important;
                    padding: 12px !important;
                    font-size: 14px !important;
                    resize: vertical !important;
                    margin-bottom: 15px !important;
                    box-sizing: border-box !important;
                    font-family: inherit !important;
                }

                .ds-textarea:focus {
                    outline: none !important;
                    border-color: #667eea !important;
                }

                .ds-result-area {
                    background: #f8f9fa !important;
                    border: 1px solid #e9ecef !important;
                    border-radius: 8px !important;
                    padding: 15px !important;
                    min-height: 100px !important;
                    margin-bottom: 15px !important;
                    font-size: 14px !important;
                    line-height: 1.6 !important;
                    white-space: pre-wrap !important;
                }

                .ds-button-group {
                    display: flex !important;
                    gap: 10px !important;
                    justify-content: flex-end !important;
                }

                .ds-btn {
                    padding: 10px 20px !important;
                    border: none !important;
                    border-radius: 6px !important;
                    cursor: pointer !important;
                    font-size: 14px !important;
                    transition: all 0.2s !important;
                }

                .ds-btn-primary {
                    background: #667eea !important;
                    color: white !important;
                }

                .ds-btn-primary:hover {
                    background: #5a6fd8 !important;
                }

                .ds-btn-secondary {
                    background: #6c757d !important;
                    color: white !important;
                }

                .ds-btn-secondary:hover {
                    background: #5a6268 !important;
                }

                .ds-overlay {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100% !important;
                    height: 100% !important;
                    background: rgba(0,0,0,0.5) !important;
                    z-index: 999999 !important;
                    display: none !important;
                }

                /* 翻译中状态 */
                .ds-translating {
                    color: #667eea !important;
                }

                /* 选中文本高亮 */
                .ds-selected-text {
                    background: rgba(102, 126, 234, 0.2) !important;
                    transition: background 0.2s !important;
                }
            `;
            document.head.appendChild(style);
            console.log('✅ 样式已添加到页面头部');
        }

        // 创建悬浮球
        createFloatingBall() {
            console.log('🎯 开始创建悬浮球...');
            
            // 再次检查是否已存在悬浮球
            if (document.querySelector('.ds-float-ball')) {
                console.log('⏭️ 悬浮球已存在，跳过创建');
                return;
            }
            
            this.floatingBall = document.createElement('button');
            this.floatingBall.className = 'ds-float-ball';
            this.floatingBall.textContent = '译';
            this.floatingBall.title = 'DeepSeek 翻译助手\n点击打开翻译面板\n拖动可移动位置';
            
            // 设置内联样式，确保显示
            const styles = {
                position: 'fixed',
                top: CONFIG.BUTTON_POSITION.y + 'px',
                left: CONFIG.BUTTON_POSITION.x + 'px',
                width: '50px',
                height: '50px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '50%',
                color: 'white',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer',
                zIndex: '2147483647',  // 最高层级
                boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Arial, sans-serif',
                userSelect: 'none',
                transition: 'all 0.3s ease'
            };
            
            // 应用所有样式
            Object.assign(this.floatingBall.style, styles);
            
            console.log('📍 悬浮球元素已创建，正在添加到页面...');
            document.body.appendChild(this.floatingBall);
            console.log('✅ 悬浮球已添加到页面');
            
            // 验证元素是否在页面中
            const added = document.querySelector('.ds-float-ball');
            if (added) {
                console.log('✅ 悬浮球在页面中确认存在');
            } else {
                console.error('❌ 悬浮球未能添加到页面');
            }
            
            // 简单的点击事件
            this.floatingBall.onclick = (e) => {
                console.log('🖱️ 悬浮球被点击 (onclick)');
                e.preventDefault();
                e.stopPropagation();
                alert('翻译面板功能测试 - 点击成功！');
                this.showPanel();
            };
            
            // 鼠标悬停效果
            this.floatingBall.onmouseenter = () => {
                this.floatingBall.style.transform = 'scale(1.1)';
                this.floatingBall.style.boxShadow = '0 6px 25px rgba(102, 126, 234, 0.6)';
            };
            
            this.floatingBall.onmouseleave = () => {
                this.floatingBall.style.transform = 'scale(1)';
                this.floatingBall.style.boxShadow = '0 4px 20px rgba(102, 126, 234, 0.4)';
            };
            
            // 绑定拖拽功能
            this.makeDraggable(this.floatingBall);
        }

        // 创建翻译面板
        createTranslatePanel() {
            console.log('🎨 开始创建翻译面板...');
            
            // 遮罩层
            this.overlay = document.createElement('div');
            this.overlay.className = 'ds-overlay';
            this.overlay.addEventListener('click', () => this.hidePanel());
            console.log('✅ 遮罩层已创建');
            
            // 主面板
            this.panel = document.createElement('div');
            this.panel.className = 'ds-translate-panel';
            
            // 创建面板头部
            const header = document.createElement('div');
            header.className = 'ds-panel-header';
            
            const title = document.createElement('h3');
            title.className = 'ds-panel-title';
            title.textContent = '🌍 DeepSeek 翻译助手';
            
            const controls = document.createElement('div');
            controls.className = 'ds-panel-controls';
            
            // 创建控制按钮
            const globalBtn = document.createElement('button');
            globalBtn.className = 'ds-control-btn';
            globalBtn.id = 'ds-global-mode';
            globalBtn.title = '全局翻译模式';
            globalBtn.textContent = '全局';
            
            const selectionBtn = document.createElement('button');
            selectionBtn.className = 'ds-control-btn active';
            selectionBtn.id = 'ds-selection-mode';
            selectionBtn.title = '划词翻译模式';
            selectionBtn.textContent = '划词';
            
            const closeBtn = document.createElement('button');
            closeBtn.className = 'ds-control-btn';
            closeBtn.id = 'ds-close-panel';
            closeBtn.title = '关闭面板';
            closeBtn.textContent = '✕';
            
            controls.appendChild(globalBtn);
            controls.appendChild(selectionBtn);
            controls.appendChild(closeBtn);
            
            header.appendChild(title);
            header.appendChild(controls);
            
            // 创建面板主体
            const body = document.createElement('div');
            body.className = 'ds-panel-body';
            
            // 输入框
            const textarea = document.createElement('textarea');
            textarea.className = 'ds-textarea';
            textarea.id = 'ds-input-text';
            textarea.placeholder = '在此输入要翻译的文本，或者在页面上选择文本...';
            
            // 结果区域
            const resultArea = document.createElement('div');
            resultArea.className = 'ds-result-area';
            resultArea.id = 'ds-result-area';
            resultArea.textContent = '翻译结果将在这里显示';
            
            // 按钮组
            const buttonGroup = document.createElement('div');
            buttonGroup.className = 'ds-button-group';
            
            const clearBtn = document.createElement('button');
            clearBtn.className = 'ds-btn ds-btn-secondary';
            clearBtn.id = 'ds-clear-btn';
            clearBtn.textContent = '清空';
            
            const translateBtn = document.createElement('button');
            translateBtn.className = 'ds-btn ds-btn-primary';
            translateBtn.id = 'ds-translate-btn';
            translateBtn.textContent = '翻译';
            
            buttonGroup.appendChild(clearBtn);
            buttonGroup.appendChild(translateBtn);
            
            body.appendChild(textarea);
            body.appendChild(resultArea);
            body.appendChild(buttonGroup);
            
            this.panel.appendChild(header);
            this.panel.appendChild(body);
            
            document.body.appendChild(this.overlay);
            document.body.appendChild(this.panel);
            
            console.log('✅ 翻译面板已创建并添加到DOM');
        }

        // 绑定事件
        bindEvents() {
            // 面板控制按钮
            document.getElementById('ds-global-mode').addEventListener('click', () => {
                this.toggleMode('global');
            });
            
            document.getElementById('ds-selection-mode').addEventListener('click', () => {
                this.toggleMode('selection');
            });
            
            document.getElementById('ds-close-panel').addEventListener('click', () => {
                this.hidePanel();
            });
            
            // 功能按钮
            document.getElementById('ds-translate-btn').addEventListener('click', () => {
                this.translateText();
            });
            
            document.getElementById('ds-clear-btn').addEventListener('click', () => {
                this.clearText();
            });
            
            // 文本选择事件
            document.addEventListener('mouseup', (e) => {
                if (this.isSelectionMode) {
                    setTimeout(() => this.handleTextSelection(e), 100);
                }
            });
            
            // 键盘快捷键
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.shiftKey && e.key === 'T') {
                    e.preventDefault();
                    this.showPanel();
                }
            });
        }

        // 模式切换
        toggleMode(mode) {
            const globalBtn = document.getElementById('ds-global-mode');
            const selectionBtn = document.getElementById('ds-selection-mode');
            
            if (mode === 'global') {
                this.isGlobalMode = true;
                this.isSelectionMode = false;
                globalBtn.classList.add('active');
                selectionBtn.classList.remove('active');
            } else {
                this.isGlobalMode = false;
                this.isSelectionMode = true;
                globalBtn.classList.remove('active');
                selectionBtn.classList.add('active');
            }
        }

        // 处理文本选择
        handleTextSelection(e) {
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();
            
            if (selectedText && selectedText.length > 0) {
                this.selectedText = selectedText;
                document.getElementById('ds-input-text').value = selectedText;
                
                if (CONFIG.AUTO_TRANSLATE) {
                    this.translateText();
                } else {
                    // 显示提示或者自动打开面板
                    if (!this.isPanelVisible()) {
                        this.showPanel();
                    }
                }
            }
        }

        // 翻译文本
        async translateText() {
            const inputText = document.getElementById('ds-input-text').value.trim();
            const resultArea = document.getElementById('ds-result-area');
            const translateBtn = document.getElementById('ds-translate-btn');
            
            if (!inputText) {
                resultArea.textContent = '请输入要翻译的文本';
                return;
            }
            
            if (!CONFIG.API_KEY) {
                resultArea.textContent = '❌ 请先配置 DeepSeek API Key\n在脚本文件开头的 CONFIG.API_KEY 处填入您的 API Key';
                return;
            }
            
            // 显示翻译中状态
            translateBtn.disabled = true;
            translateBtn.textContent = '翻译中...';
            resultArea.textContent = '🔄 正在翻译，请稍候...';
            
            try {
                const translation = await this.callDeepSeekAPI(inputText);
                resultArea.textContent = translation;
            } catch (error) {
                console.error('翻译失败:', error);
                resultArea.textContent = `❌ 翻译失败: ${error.message}`;
            } finally {
                translateBtn.disabled = false;
                translateBtn.textContent = '翻译';
            }
        }

        // 调用 DeepSeek API
        callDeepSeekAPI(text) {
            return new Promise((resolve, reject) => {
                const targetLangName = this.getLanguageName(CONFIG.TARGET_LANGUAGE);
                const prompt = `请将以下文本翻译为${targetLangName}，只返回翻译结果，不要添加任何解释：\n\n${text}`;
                
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: 'https://api.deepseek.com/v1/chat/completions',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${CONFIG.API_KEY}`
                    },
                    data: JSON.stringify({
                        model: 'deepseek-chat',
                        messages: [
                            {
                                role: 'user',
                                content: prompt
                            }
                        ],
                        max_tokens: 4000,
                        temperature: 0.1
                    }),
                    onload: function(response) {
                        try {
                            const data = JSON.parse(response.responseText);
                            if (data.choices && data.choices[0] && data.choices[0].message) {
                                resolve(data.choices[0].message.content.trim());
                            } else {
                                reject(new Error('API 响应格式错误'));
                            }
                        } catch (error) {
                            reject(new Error('解析响应失败: ' + error.message));
                        }
                    },
                    onerror: function(error) {
                        reject(new Error('网络请求失败'));
                    }
                });
            });
        }

        // 获取语言名称
        getLanguageName(code) {
            const langMap = {
                'zh': '中文',
                'en': '英文',
                'ja': '日文',
                'ko': '韩文',
                'fr': '法文',
                'de': '德文',
                'es': '西班牙文',
                'ru': '俄文'
            };
            return langMap[code] || '中文';
        }

        // 清空文本
        clearText() {
            document.getElementById('ds-input-text').value = '';
            document.getElementById('ds-result-area').textContent = '翻译结果将在这里显示';
        }

        // 显示面板
        showPanel() {
            console.log('📱 显示面板方法被调用');
            
            // 检查面板元素是否存在
            if (!this.overlay || !this.panel) {
                console.error('❌ 面板元素不存在，重新创建');
                this.createTranslatePanel();
            }
            
            // 检查面板是否在DOM中
            if (!document.body.contains(this.panel)) {
                console.error('❌ 面板不在DOM中，重新添加');
                document.body.appendChild(this.overlay);
                document.body.appendChild(this.panel);
            }
            
            console.log('✅ 设置面板显示');
            this.overlay.style.display = 'block';
            this.panel.style.display = 'block';
            
            // 检查输入框是否存在
            const inputElement = document.getElementById('ds-input-text');
            if (inputElement) {
                inputElement.focus();
                console.log('✅ 输入框已聚焦');
            } else {
                console.error('❌ 找不到输入框元素');
            }
        }

        // 隐藏面板
        hidePanel() {
            this.overlay.style.display = 'none';
            this.panel.style.display = 'none';
        }

        // 检查面板是否可见
        isPanelVisible() {
            return this.panel.style.display === 'block';
        }

        // 使元素可拖拽
        makeDraggable(element) {
            let isDragging = false;
            let startX, startY, startLeft, startTop;
            
            element.onmousedown = (e) => {
                // 只在鼠标右键或中键时允许拖拽，左键用于点击
                if (e.button !== 0) return;
                
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                startLeft = parseInt(element.style.left) || 0;
                startTop = parseInt(element.style.top) || 0;
                
                element.style.cursor = 'grabbing';
                console.log('🖱️ 开始拖拽');
                
                // 临时禁用点击事件
                element.style.pointerEvents = 'none';
                setTimeout(() => {
                    element.style.pointerEvents = 'auto';
                }, 200);
                
                e.preventDefault();
            };
            
            document.onmousemove = (e) => {
                if (!isDragging) return;
                
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                
                let newLeft = startLeft + deltaX;
                let newTop = startTop + deltaY;
                
                // 边界检查
                const maxLeft = window.innerWidth - element.offsetWidth;
                const maxTop = window.innerHeight - element.offsetHeight;
                
                newLeft = Math.max(0, Math.min(newLeft, maxLeft));
                newTop = Math.max(0, Math.min(newTop, maxTop));
                
                element.style.left = newLeft + 'px';
                element.style.top = newTop + 'px';
                
                // 保存位置
                CONFIG.BUTTON_POSITION.x = newLeft;
                CONFIG.BUTTON_POSITION.y = newTop;
                GM_setValue('buttonPosition', CONFIG.BUTTON_POSITION);
            };
            
            document.onmouseup = () => {
                if (isDragging) {
                    isDragging = false;
                    element.style.cursor = 'pointer';
                    console.log('🖱️ 结束拖拽');
                }
            };
        }
    }

    // ========================================
    // 初始化
    // ========================================
    function init() {
        console.log('🔧 开始初始化 DeepSeek 翻译助手...');
        
        // 只在顶层窗口运行，避免在 iframe 中重复创建
        if (window.self !== window.top) {
            console.log('⏭️ 检测到 iframe 环境，跳过初始化');
            return;
        }
        
        // 检查是否已经初始化过
        if (document.querySelector('.ds-float-ball')) {
            console.log('⏭️ 悬浮球已存在，跳过重复初始化');
            return;
        }
        
        // 确保 body 元素存在
        if (!document.body) {
            console.log('⏳ 等待 body 元素...');
            setTimeout(init, 100);
            return;
        }
        
        // 加载保存的位置
        const savedPosition = GM_getValue('buttonPosition', CONFIG.BUTTON_POSITION);
        CONFIG.BUTTON_POSITION = savedPosition;
        
        // 创建翻译器实例
        try {
            new SimpleTranslator();
            console.log('✅ DeepSeek 翻译助手初始化成功');
        } catch (error) {
            console.error('❌ 初始化失败:', error);
        }
        
        // 如果未配置 API Key，显示提示
        if (!CONFIG.API_KEY) {
            console.warn('⚠️ 请配置 DeepSeek API Key 后使用翻译功能');
        }
    }

    // 确保只初始化一次
    let initialized = false;
    
    function safeInit() {
        if (initialized) {
            console.log('⏭️ 已初始化，跳过重复执行');
            return;
        }
        initialized = true;
        init();
    }

    // 多种方式确保初始化，但避免重复
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', safeInit, { once: true });
    } else {
        safeInit();
    }

})();
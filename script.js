// To-Do App JavaScript with AI Planning Feature
class TodoApp {
    constructor() {
        this.tasks = [];
        this.taskIdCounter = 1;
        this.aiSettings = {
            endpoint: '',
            apiKey: '',
            model: 'gpt-4o'
        };
        this.init();
    }

    init() {
        this.loadTasks();
        this.loadAISettings();
        this.bindEvents();
        this.initializeCalendarIntegration();
        this.render();
    }

    bindEvents() {
        const taskInput = document.getElementById('taskInput');
        const addTaskBtn = document.getElementById('addTaskBtn');
        const settingsBtn = document.getElementById('settingsBtn');
        const closeSettingsBtn = document.getElementById('closeSettingsBtn');
        const saveSettingsBtn = document.getElementById('saveSettingsBtn');
        const testConnectionBtn = document.getElementById('testConnectionBtn');

        // Add task events
        addTaskBtn.addEventListener('click', () => this.addTask());
        taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTask();
            }
        });

        // Settings events
        settingsBtn.addEventListener('click', () => this.showSettings());
        closeSettingsBtn.addEventListener('click', () => this.hideSettings());
        saveSettingsBtn.addEventListener('click', () => this.saveAISettings());
        testConnectionBtn.addEventListener('click', () => this.testAIConnection());

        // Clear AI settings button
        const clearAIBtn = document.getElementById('clearAIBtn');
        if (clearAIBtn) {
            clearAIBtn.addEventListener('click', () => this.clearAISettings());
        }

        // Close settings when clicking outside
        document.getElementById('settingsPanel').addEventListener('click', (e) => {
            if (e.target.id === 'settingsPanel') {
                this.hideSettings();
            }
        });

        // Smart priority suggestion
        const suggestPriorityBtn = document.getElementById('suggest-priority');
        if (suggestPriorityBtn) {
            suggestPriorityBtn.addEventListener('click', () => this.handleSmartPriority());
        }

        // Task list event delegation
        this.setupTaskListEvents();
    }

    setupTaskListEvents() {
        const taskList = document.getElementById('taskList');

        // Delete button events
        taskList.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-btn')) {
                const taskId = parseInt(e.target.dataset.taskId);
                if (confirm('Are you sure you want to delete this task?')) {
                    this.deleteTask(taskId);
                }
            } else if (e.target.classList.contains('subtask-delete-btn')) {
                const taskId = parseInt(e.target.dataset.taskId);
                const subtaskId = parseInt(e.target.dataset.subtaskId);
                if (confirm('Are you sure you want to delete this subtask?')) {
                    this.deleteSubtask(taskId, subtaskId);
                }
            } else if (e.target.classList.contains('add-subtask-btn')) {
                const taskId = parseInt(e.target.dataset.taskId);
                this.showSubtaskInput(taskId);
            } else if (e.target.classList.contains('plan-for-me-btn') || e.target.closest('.plan-for-me-btn')) {
                const button = e.target.classList.contains('plan-for-me-btn') ? e.target : e.target.closest('.plan-for-me-btn');
                const taskId = parseInt(button.dataset.taskId);
                this.planForTask(taskId);
            } else if (e.target.classList.contains('info-btn') || e.target.closest('.info-btn')) {
                const button = e.target.classList.contains('info-btn') ? e.target : e.target.closest('.info-btn');
                const taskId = parseInt(button.dataset.taskId);
                this.toggleTaskInfo(taskId);
            } else if (e.target.classList.contains('analyze-btn')) {
                const taskId = parseInt(e.target.dataset.taskId);
                this.analyzeTask(taskId);
            }
        });

        // Checkbox events
        taskList.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox' && e.target.classList.contains('task-checkbox')) {
                const taskId = parseInt(e.target.dataset.taskId);
                this.toggleTaskComplete(taskId);
            } else if (e.target.type === 'checkbox' && e.target.classList.contains('subtask-checkbox')) {
                const taskId = parseInt(e.target.dataset.taskId);
                const subtaskId = parseInt(e.target.dataset.subtaskId);
                this.toggleSubtaskComplete(taskId, subtaskId);
            }
        });

        // Edit functionality
        taskList.addEventListener('click', (e) => {
            if (e.target.classList.contains('task-text')) {
                this.enableTaskTextEditing(e.target);
            } else if (e.target.classList.contains('subtask-text')) {
                this.enableSubtaskTextEditing(e.target);
            }
        });

        // Subtask input events
        taskList.addEventListener('keypress', (e) => {
            if (e.target.classList.contains('subtask-input') && e.key === 'Enter') {
                const taskId = parseInt(e.target.closest('.subtask-input-container').dataset.taskId);
                const subtaskText = e.target.value.trim();
                if (subtaskText) {
                    this.addSubtask(taskId, subtaskText);
                }
                this.hideSubtaskInput(taskId);
            }
        });

        taskList.addEventListener('blur', (e) => {
            if (e.target.classList.contains('subtask-input')) {
                const taskId = parseInt(e.target.closest('.subtask-input-container').dataset.taskId);
                setTimeout(() => this.hideSubtaskInput(taskId), 100);
            }
        }, true);
    }

    addTask() {
        const taskInput = document.getElementById('taskInput');
        const taskPriority = document.getElementById('taskPriority');
        const taskDueDate = document.getElementById('taskDueDate');
        const taskText = taskInput.value.trim();

        if (!taskText) {
            taskInput.focus();
            return;
        }

        const newTask = {
            id: this.taskIdCounter++,
            text: taskText,
            completed: false,
            priority: taskPriority.value,
            dueDate: taskDueDate.value,
            createdAt: new Date().toISOString(),
            subtasks: []
        };

        this.tasks.push(newTask);
        taskInput.value = '';
        taskPriority.value = 'none';
        taskDueDate.value = '';
        
        // Add celebration effect
        this.showTaskAddedCelebration();
        
        this.saveTasks();
        this.render();
        taskInput.focus();
    }

    async handleSmartPriority() {
        const taskInput = document.getElementById('taskInput');
        const taskPriority = document.getElementById('taskPriority');
        const taskDueDate = document.getElementById('taskDueDate');
        const suggestBtn = document.getElementById('suggest-priority');
        
        const taskText = taskInput.value.trim();
        if (!taskText) {
            this.showNotification('Please enter a task first', 'warning');
            taskInput.focus();
            return;
        }

        // Show loading state
        suggestBtn.disabled = true;
        suggestBtn.textContent = '🔄 Analyzing...';

        try {
            const suggestedPriority = await this.suggestSmartPriority(taskText, taskDueDate.value);
            taskPriority.value = suggestedPriority;
            
            // Show success animation
            taskPriority.style.transform = 'scale(1.1)';
            taskPriority.style.transition = 'transform 0.3s ease';
            setTimeout(() => {
                taskPriority.style.transform = 'scale(1)';
            }, 300);

            this.showNotification(`Priority set to ${suggestedPriority.toUpperCase()}`, 'success');
        } catch (error) {
            console.error('Error suggesting priority:', error);
            this.showNotification('Failed to suggest priority', 'error');
        } finally {
            // Reset button state
            suggestBtn.disabled = false;
            suggestBtn.textContent = '🤖 Smart';
        }
    }

    addSubtask(taskId, subtaskText) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        const newSubtask = {
            id: this.taskIdCounter++,
            text: subtaskText.trim(),
            completed: false
        };

        task.subtasks.push(newSubtask);
        this.saveTasks();
        this.render();
    }

    toggleTaskComplete(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            // When a task is completed, mark all subtasks as completed too
            if (task.completed) {
                task.subtasks.forEach(subtask => subtask.completed = true);
                // Show celebration
                this.showCompletionCelebration(taskId);
            }
            this.saveTasks();
            this.render();
        }
    }

    toggleSubtaskComplete(taskId, subtaskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            const subtask = task.subtasks.find(s => s.id === subtaskId);
            if (subtask) {
                subtask.completed = !subtask.completed;
                this.saveTasks();
                this.render();
            }
        }
    }

    editTask(taskId, newText) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task && newText.trim()) {
            task.text = newText.trim();
            this.saveTasks();
            this.render();
        }
    }

    editSubtask(taskId, subtaskId, newText) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            const subtask = task.subtasks.find(s => s.id === subtaskId);
            if (subtask && newText.trim()) {
                subtask.text = newText.trim();
                this.saveTasks();
                this.render();
            }
        }
    }

    deleteTask(taskId) {
        this.tasks = this.tasks.filter(t => t.id !== taskId);
        this.saveTasks();
        this.render();
    }

    deleteSubtask(taskId, subtaskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.subtasks = task.subtasks.filter(s => s.id !== subtaskId);
            this.saveTasks();
            this.render();
        }
    }

    saveTasks() {
        try {
            localStorage.setItem('todoAppTasks', JSON.stringify(this.tasks));
            localStorage.setItem('todoAppCounter', this.taskIdCounter.toString());
        } catch (error) {
            console.error('Error saving tasks:', error);
        }
    }

    loadTasks() {
        try {
            const savedTasks = localStorage.getItem('todoAppTasks');
            const savedCounter = localStorage.getItem('todoAppCounter');
            
            if (savedTasks) {
                this.tasks = JSON.parse(savedTasks);
            }
            
            if (savedCounter) {
                this.taskIdCounter = parseInt(savedCounter, 10);
            }
        } catch (error) {
            console.error('Error loading tasks:', error);
            this.tasks = [];
            this.taskIdCounter = 1;
        }
    }

    render() {
        const taskList = document.getElementById('taskList');
        
        if (this.tasks.length === 0) {
            taskList.innerHTML = `
                <div class="empty-state">
                    <h3>No tasks yet!</h3>
                    <p>Add your first task above to get started.</p>
                </div>
            `;
            return;
        }

        taskList.innerHTML = this.tasks.map(task => this.renderTask(task)).join('');
    }

    renderTask(task) {
        const subtasksHtml = task.subtasks.map(subtask => this.renderSubtask(task.id, subtask)).join('');
        const priorityClass = task.priority ? `priority-${task.priority}` : 'priority-none';
        const dueDateDisplay = task.dueDate ? `📅 ${new Date(task.dueDate).toLocaleDateString()}` : '';
        const priorityIcon = this.getPriorityIcon(task.priority);
        const createdDate = task.createdAt ? new Date(task.createdAt).toLocaleDateString() : 'Unknown';
        const aiSuggested = task.aiSuggestedPriority ? '🤖 AI Suggested' : '';
        
        return `
            <li class="task-item ${priorityClass}" data-task-id="${task.id}">
                <div class="task-content">
                    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} 
                           data-task-id="${task.id}">
                    <div class="task-info">
                        <span class="task-text ${task.completed ? 'completed' : ''}" 
                              data-task-id="${task.id}" contenteditable="false">
                            ${priorityIcon} ${this.escapeHtml(task.text)}
                        </span>
                        ${dueDateDisplay ? `<span class="due-date">${dueDateDisplay}</span>` : ''}
                        ${aiSuggested ? `<span class="ai-badge">${aiSuggested}</span>` : ''}
                    </div>
                    <div class="task-actions">
                        <button class="info-btn" data-task-id="${task.id}" title="Task Information">
                            <span class="info-icon">ℹ️</span>
                        </button>
                        <button class="plan-for-me-btn" data-task-id="${task.id}" title="AI Plan for Me">
                            <span class="magic-wand">🪄</span>
                            <span class="btn-text">Plan for Me</span>
                            <span class="loading-spinner">🔄</span>
                        </button>
                        <button class="add-subtask-btn" data-task-id="${task.id}">+ Subtask</button>
                        <button class="delete-btn" data-task-id="${task.id}" title="Delete task">&times;</button>
                    </div>
                </div>
                
                <!-- Task Info Panel -->
                <div class="task-info-panel" data-task-id="${task.id}" style="display: none;">
                    <div class="info-content">
                        <div class="info-section">
                            <h4>📊 Task Details</h4>
                            <div class="info-grid">
                                <div class="info-item">
                                    <span class="info-label">Created:</span>
                                    <span class="info-value">${createdDate}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Priority:</span>
                                    <span class="info-value">${priorityIcon} ${task.priority || 'None'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Due Date:</span>
                                    <span class="info-value">${task.dueDate || 'Not set'}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Subtasks:</span>
                                    <span class="info-value">${task.subtasks.length} items</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Completion:</span>
                                    <span class="info-value">${this.getTaskProgress(task)}%</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="info-section">
                            <h4>🎯 AI Insights</h4>
                            <div class="ai-insights">
                                <button class="analyze-btn" data-task-id="${task.id}">
                                    <span class="analyze-icon">🔍</span>
                                    Analyze Task Context
                                </button>
                                <button class="suggest-priority-btn" data-task-id="${task.id}">
                                    <span class="priority-icon">⚡</span>
                                    Suggest Priority
                                </button>
                            </div>
                            <div class="ai-results" data-task-id="${task.id}"></div>
                        </div>
                    </div>
                </div>
                
                ${task.subtasks.length > 0 ? `<ul class="subtask-list">${subtasksHtml}</ul>` : ''}
                <div class="subtask-input-container" style="display: none;" data-task-id="${task.id}">
                    <input type="text" class="subtask-input" placeholder="Enter subtask..." maxlength="150">
                </div>
            </li>
        `;
    }

    getTaskProgress(task) {
        if (task.subtasks.length === 0) {
            return task.completed ? 100 : 0;
        }
        const completedSubtasks = task.subtasks.filter(st => st.completed).length;
        return Math.round((completedSubtasks / task.subtasks.length) * 100);
    }

    getPriorityIcon(priority) {
        switch(priority) {
            case 'high': return '🔴';
            case 'medium': return '🟡';
            case 'low': return '🟢';
            default: return '';
        }
    }

    renderSubtask(taskId, subtask) {
        return `
            <li class="subtask-item" data-task-id="${taskId}" data-subtask-id="${subtask.id}">
                <div class="subtask-content">
                    <input type="checkbox" class="subtask-checkbox" ${subtask.completed ? 'checked' : ''} 
                           data-task-id="${taskId}" data-subtask-id="${subtask.id}">
                    <span class="subtask-text ${subtask.completed ? 'completed' : ''}" 
                          data-task-id="${taskId}" data-subtask-id="${subtask.id}" 
                          contenteditable="false">${this.escapeHtml(subtask.text)}</span>
                    <button class="subtask-delete-btn" data-task-id="${taskId}" 
                            data-subtask-id="${subtask.id}" title="Delete subtask">&times;</button>
                </div>
            </li>
        `;
    }

    enableTaskTextEditing(element) {
        const taskId = parseInt(element.dataset.taskId);
        const originalText = element.textContent;
        
        element.contentEditable = true;
        element.classList.add('editing');
        element.focus();
        
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        const finishEditing = () => {
            element.contentEditable = false;
            element.classList.remove('editing');
            const newText = element.textContent.trim();
            if (newText && newText !== originalText) {
                this.editTask(taskId, newText);
            } else {
                element.textContent = originalText;
            }
        };

        element.addEventListener('blur', finishEditing, { once: true });
        element.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                element.blur();
            }
        }, { once: true });
    }

    enableSubtaskTextEditing(element) {
        const taskId = parseInt(element.dataset.taskId);
        const subtaskId = parseInt(element.dataset.subtaskId);
        const originalText = element.textContent;
        
        element.contentEditable = true;
        element.classList.add('editing');
        element.focus();
        
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        const finishEditing = () => {
            element.contentEditable = false;
            element.classList.remove('editing');
            const newText = element.textContent.trim();
            if (newText && newText !== originalText) {
                this.editSubtask(taskId, subtaskId, newText);
            } else {
                element.textContent = originalText;
            }
        };

        element.addEventListener('blur', finishEditing, { once: true });
        element.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                element.blur();
            }
        }, { once: true });
    }

    showSubtaskInput(taskId) {
        const inputContainer = document.querySelector(`[data-task-id="${taskId}"].subtask-input-container`);
        if (inputContainer) {
            inputContainer.style.display = 'block';
            const input = inputContainer.querySelector('.subtask-input');
            input.value = '';
            input.focus();
        }
    }

    hideSubtaskInput(taskId) {
        const inputContainer = document.querySelector(`[data-task-id="${taskId}"].subtask-input-container`);
        if (inputContainer) {
            inputContainer.style.display = 'none';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // AI Settings Management
    showSettings() {
        const panel = document.getElementById('settingsPanel');
        panel.classList.add('show');
        
        // Load current settings into form
        document.getElementById('aiEndpoint').value = this.aiSettings.endpoint;
        document.getElementById('aiApiKey').value = this.aiSettings.apiKey;
        document.getElementById('aiModel').value = this.aiSettings.model;
        
        // Clear status
        this.hideConnectionStatus();
    }

    hideSettings() {
        const panel = document.getElementById('settingsPanel');
        panel.classList.remove('show');
    }

    saveAISettings() {
        this.aiSettings.endpoint = document.getElementById('aiEndpoint').value.trim();
        this.aiSettings.apiKey = document.getElementById('aiApiKey').value.trim();
        this.aiSettings.model = document.getElementById('aiModel').value.trim() || 'gpt-4o';

        try {
            // Store in localStorage with basic encryption (base64)
            const settingsStr = btoa(JSON.stringify(this.aiSettings));
            localStorage.setItem('todoAppAISettings', settingsStr);
            
            this.showConnectionStatus('Settings saved successfully!', 'success');
            setTimeout(() => this.hideSettings(), 1500);
        } catch (error) {
            console.error('Error saving AI settings:', error);
            this.showConnectionStatus('Error saving settings. Please try again.', 'error');
        }
    }

    clearAISettings() {
        if (confirm('Are you sure you want to clear all AI settings? The app will continue to work with smart rule-based features.')) {
            localStorage.removeItem('todoAppAISettings');
            this.aiSettings = {
                endpoint: '',
                apiKey: '',
                model: 'gpt-4o'
            };
            
            // Clear the input fields
            document.getElementById('aiEndpoint').value = '';
            document.getElementById('aiApiKey').value = '';
            document.getElementById('aiModel').value = 'gpt-4o';
            
            // Clear connection status
            this.showConnectionStatus('AI settings cleared. App will use smart rule-based features.', 'info');
        }
    }

    loadAISettings() {
        try {
            const settingsStr = localStorage.getItem('todoAppAISettings');
            if (settingsStr) {
                this.aiSettings = JSON.parse(atob(settingsStr));
            }
        } catch (error) {
            console.error('Error loading AI settings:', error);
            this.aiSettings = { endpoint: '', apiKey: '', model: 'gpt-4o' };
        }
    }

    async testAIConnection() {
        const endpoint = document.getElementById('aiEndpoint').value.trim();
        const apiKey = document.getElementById('aiApiKey').value.trim();
        const model = document.getElementById('aiModel').value.trim() || 'gpt-4o';

        if (!endpoint || !apiKey) {
            this.showConnectionStatus('Please enter both endpoint and API key.', 'error');
            return;
        }

        const testBtn = document.getElementById('testConnectionBtn');
        const spinner = testBtn.querySelector('.btn-spinner');
        const text = testBtn.querySelector('.btn-text');
        
        // Show loading state
        spinner.style.display = 'inline';
        text.style.display = 'none';
        testBtn.disabled = true;

        try {
            const success = await this.callAzureAI(endpoint, apiKey, model, 'Test connection');
            if (success) {
                this.showConnectionStatus('✅ Connection successful!', 'success');
            } else {
                this.showConnectionStatus('❌ Connection failed. Please check your settings.', 'error');
            }
        } catch (error) {
            console.error('Connection test failed:', error);
            this.showConnectionStatus('❌ Connection failed: ' + error.message, 'error');
        } finally {
            // Hide loading state
            spinner.style.display = 'none';
            text.style.display = 'inline';
            testBtn.disabled = false;
        }
    }

    showConnectionStatus(message, type) {
        const status = document.getElementById('connectionStatus');
        status.textContent = message;
        status.className = `connection-status ${type}`;
    }

    hideConnectionStatus() {
        const status = document.getElementById('connectionStatus');
        status.className = 'connection-status';
    }

    // AI Planning Feature
    async planForTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        const button = document.querySelector(`[data-task-id="${taskId}"].plan-for-me-btn`);
        if (!button) return;

        // Show loading state
        button.classList.add('loading');
        button.disabled = true;

        try {
            let subtasks = [];
            let method = 'Smart rule-based';
            
            if (this.aiSettings.endpoint && this.aiSettings.apiKey) {
                // Try AI first if configured
                try {
                    subtasks = await this.callAzureAI(
                        this.aiSettings.endpoint,
                        this.aiSettings.apiKey,
                        this.aiSettings.model,
                        task.text
                    );
                    method = 'AI-powered';
                } catch (error) {
                    console.log('AI generation failed, falling back to rule-based planning:', error);
                    subtasks = this.generateRuleBasedSubtasks(task.text);
                }
            } else {
                // Use intelligent rule-based planning when no AI is configured
                subtasks = this.generateRuleBasedSubtasks(task.text);
            }

            if (subtasks && subtasks.length > 0) {
                // Limit to maximum 5 subtasks and add them
                const limitedSubtasks = subtasks.slice(0, 5);
                limitedSubtasks.forEach(subtaskText => {
                    if (subtaskText.trim()) {
                        this.addSubtask(taskId, subtaskText.trim());
                    }
                });
                
                // Show success message
                this.showNotification(`✨ ${method} planning complete! Added ${limitedSubtasks.length} subtasks.`, 'success');
            } else {
                this.showNotification('No subtasks were generated. Please try again.', 'warning');
            }
        } catch (error) {
            console.error('Planning failed:', error);
            this.showNotification('Planning failed: ' + error.message, 'error');
        } finally {
            // Hide loading state
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    generateRuleBasedSubtasks(taskText) {
        const text = taskText.toLowerCase();
        
        // Project-related keywords and their subtask templates
        const projectPatterns = [
            {
                keywords: ['website', 'web app', 'site', 'webpage'],
                subtasks: ['Plan website structure and features', 'Design user interface and layout', 'Develop core functionality', 'Test and debug', 'Deploy and launch']
            },
            {
                keywords: ['presentation', 'present', 'pitch', 'demo'],
                subtasks: ['Research topic and gather data', 'Create presentation outline', 'Design slides and visuals', 'Practice presentation delivery', 'Prepare for questions and feedback']
            },
            {
                keywords: ['report', 'document', 'write', 'paper', 'essay'],
                subtasks: ['Research and gather information', 'Create document outline', 'Write first draft', 'Review and edit content', 'Finalize formatting and submit']
            },
            {
                keywords: ['meeting', 'conference', 'event', 'workshop'],
                subtasks: ['Set agenda and objectives', 'Invite participants and book venue', 'Prepare materials and resources', 'Conduct meeting/event', 'Follow up with action items']
            },
            {
                keywords: ['learn', 'study', 'course', 'training', 'skill'],
                subtasks: ['Identify learning resources', 'Create study schedule', 'Complete core learning modules', 'Practice with exercises', 'Review and test knowledge']
            },
            {
                keywords: ['app', 'application', 'software', 'program'],
                subtasks: ['Define requirements and features', 'Design architecture and UI', 'Implement core functionality', 'Test and debug thoroughly', 'Deploy and maintain']
            },
            {
                keywords: ['budget', 'financial', 'money', 'expense'],
                subtasks: ['Gather financial data', 'Analyze current spending', 'Create budget plan', 'Implement tracking system', 'Review and adjust monthly']
            },
            {
                keywords: ['project', 'plan', 'organize'],
                subtasks: ['Define project scope and goals', 'Break down into phases', 'Assign resources and timeline', 'Execute planned activities', 'Monitor progress and adjust']
            },
            {
                keywords: ['research', 'investigate', 'analyze'],
                subtasks: ['Define research questions', 'Gather relevant sources', 'Analyze and synthesize data', 'Draw conclusions', 'Document findings']
            }
        ];

        // Find matching pattern
        for (const pattern of projectPatterns) {
            if (pattern.keywords.some(keyword => text.includes(keyword))) {
                return pattern.subtasks.slice(0, 4); // Return first 4 subtasks
            }
        }

        // Generic action-based breakdown
        const actionWords = ['complete', 'finish', 'do', 'make', 'create', 'build', 'develop', 'implement'];
        if (actionWords.some(word => text.includes(word))) {
            return [
                'Plan approach and gather requirements',
                'Collect necessary resources and tools',
                'Execute main work in phases',
                'Review, test and finalize'
            ];
        }

        // Default intelligent breakdown based on task length and complexity
        if (taskText.length > 50) {
            return [
                'Break down into smaller components',
                'Research and prepare thoroughly',
                'Execute step by step',
                'Review and refine results'
            ];
        }

        // Simple task breakdown
        return [
            'Plan and prepare',
            'Start implementation',
            'Complete main work',
            'Review and finalize'
        ];
    }

    async callAzureAI(endpoint, apiKey, model, taskText, expectJsonArray = true) {
        // Ensure endpoint ends with proper path
        const baseUrl = endpoint.replace(/\/$/, '');
        const apiUrl = `${baseUrl}/openai/deployments/${model}/chat/completions?api-version=2024-02-01`;

        let prompt;
        if (expectJsonArray) {
            prompt = `You are a task planning assistant. Given a main task, break it down into actionable subtasks.

Main Task: "${taskText}"

Requirements:
- Provide exactly 3-5 specific, actionable subtasks (maximum 5)
- Each subtask should be a clear action item
- Keep subtasks concise (under 100 characters each)
- Return ONLY a JSON array of strings
- No explanations or additional text
- Do not exceed 5 subtasks

Example format: ["Subtask 1", "Subtask 2", "Subtask 3"]`;
        } else {
            prompt = taskText; // Use the provided prompt directly
        }

        const requestBody = {
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: expectJsonArray ? 500 : 800,
            temperature: 0.7
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': apiKey
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid response format from AI service');
        }

        const content = data.choices[0].message.content.trim();
        
        if (!expectJsonArray) {
            return content; // Return raw content for analysis
        }
        
        try {
            // Try to parse as JSON array for subtasks
            const subtasks = JSON.parse(content);
            if (Array.isArray(subtasks)) {
                return subtasks.slice(0, 5); // Limit to 5 subtasks max to match prompt
            } else {
                throw new Error('Response is not an array');
            }
        } catch (parseError) {
            // Fallback: try to extract subtasks from text
            const lines = content.split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('[') && !line.startsWith(']'))
                .map(line => line.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '').replace(/^["']|["']$/g, ''))
                .filter(line => line.length > 0);
            
            return lines.slice(0, 5); // Limit to 5 subtasks max to match prompt
        }
    }

    // Celebration and Animation Functions
    showTaskAddedCelebration() {
        const addBtn = document.getElementById('addTaskBtn');
        addBtn.style.transform = 'scale(1.1)';
        addBtn.style.boxShadow = '0 15px 35px rgba(102, 126, 234, 0.6)';
        
        setTimeout(() => {
            addBtn.style.transform = '';
            addBtn.style.boxShadow = '';
        }, 200);
    }

    showCompletionCelebration(taskId) {
        const taskElement = document.querySelector(`[data-task-id="${taskId}"].task-item`);
        if (taskElement) {
            taskElement.classList.add('celebrating');
            
            // Create confetti effect
            this.createConfetti();
            
            setTimeout(() => {
                taskElement.classList.remove('celebrating');
            }, 600);
        }
    }

    createConfetti() {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7'];
        
        for (let i = 0; i < 15; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = Math.random() * 100 + 'vw';
                confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.animationDelay = Math.random() * 3 + 's';
                confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
                
                document.body.appendChild(confetti);
                
                setTimeout(() => {
                    confetti.remove();
                }, 5000);
            }, i * 100);
        }
    }

    // Task Info Panel Functions
    toggleTaskInfo(taskId) {
        const infoPanel = document.querySelector(`[data-task-id="${taskId}"].task-info-panel`);
        if (infoPanel) {
            const isVisible = infoPanel.style.display !== 'none';
            infoPanel.style.display = isVisible ? 'none' : 'block';
            
            // Update button appearance
            const infoBtn = document.querySelector(`[data-task-id="${taskId}"].info-btn`);
            if (infoBtn) {
                infoBtn.style.background = isVisible ? 
                    'linear-gradient(135deg, #17a2b8 0%, #20c997 100%)' : 
                    'linear-gradient(135deg, #138496 0%, #1abc9c 100%)';
            }
        }
    }

    async analyzeTaskContext(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        const resultsDiv = document.querySelector(`[data-task-id="${taskId}"].ai-results`);
        const analyzeBtn = document.querySelector(`[data-task-id="${taskId}"].analyze-btn`);
        
        if (!resultsDiv || !analyzeBtn) return;

        // Show loading state
        resultsDiv.className = 'ai-results loading';
        resultsDiv.textContent = '🤖 Analyzing task context...';
        analyzeBtn.disabled = true;

        try {
            if (!this.aiSettings.endpoint || !this.aiSettings.apiKey) {
                throw new Error('AI settings not configured');
            }

            const analysis = await this.getTaskAnalysis(task);
            resultsDiv.className = 'ai-results has-content';
            resultsDiv.innerHTML = `
                <div style="text-align: left;">
                    <strong>🎯 Analysis Results:</strong><br>
                    ${analysis}
                </div>
            `;
        } catch (error) {
            resultsDiv.className = 'ai-results';
            resultsDiv.textContent = '❌ Analysis failed. Please check AI settings.';
        } finally {
            analyzeBtn.disabled = false;
        }
    }

    async suggestPriority(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        const resultsDiv = document.querySelector(`[data-task-id="${taskId}"].ai-results`);
        const priorityBtn = document.querySelector(`[data-task-id="${taskId}"].suggest-priority-btn`);
        
        if (!resultsDiv || !priorityBtn) return;

        // Show loading state
        resultsDiv.className = 'ai-results loading';
        resultsDiv.textContent = '⚡ Analyzing priority level...';
        priorityBtn.disabled = true;

        try {
            if (!this.aiSettings.endpoint || !this.aiSettings.apiKey) {
                throw new Error('AI settings not configured');
            }

            const suggestedPriority = await this.getAIPrioritySuggestion(task);
            
            // Update task priority
            if (suggestedPriority && ['low', 'medium', 'high'].includes(suggestedPriority.level)) {
                task.priority = suggestedPriority.level;
                task.aiSuggestedPriority = true;
                this.saveTasks();
                this.render();
                
                resultsDiv.className = 'ai-results has-content';
                resultsDiv.innerHTML = `
                    <div style="text-align: left;">
                        <strong>⚡ Priority Updated:</strong><br>
                        Set to <strong>${this.getPriorityIcon(suggestedPriority.level)} ${suggestedPriority.level.toUpperCase()}</strong><br>
                        <em>Reason: ${suggestedPriority.reason}</em>
                    </div>
                `;
            } else {
                resultsDiv.className = 'ai-results';
                resultsDiv.textContent = '⚡ Could not determine priority. Task seems to have normal priority.';
            }
        } catch (error) {
            resultsDiv.className = 'ai-results';
            resultsDiv.textContent = '❌ Priority analysis failed. Please check AI settings.';
        } finally {
            priorityBtn.disabled = false;
        }
    }

    async getTaskAnalysis(task) {
        const prompt = `Analyze this task and provide insights about its complexity, time requirements, and potential challenges.

Task: "${task.text}"
Due Date: ${task.dueDate || 'Not set'}
Subtasks: ${task.subtasks.length} items
Current Priority: ${task.priority || 'None'}

Provide a brief analysis (2-3 sentences) covering:
1. Task complexity assessment
2. Estimated effort/time required
3. Key dependencies or blockers
4. Recommendations for completion

Keep response concise and actionable.`;

        const response = await this.callAzureAI(
            this.aiSettings.endpoint,
            this.aiSettings.apiKey,
            this.aiSettings.model,
            prompt,
            false // Don't expect JSON array
        );

        return response || 'Unable to analyze task at this time.';
    }

    async getAIPrioritySuggestion(task) {
        // Mock calendar context (in real app, this would come from Microsoft Graph API)
        const mockCalendarContext = this.getMockCalendarContext();
        const mockUserRole = this.getMockUserRole();

        const prompt = `You are a smart task priority assistant. Analyze this task and suggest an appropriate priority level.

TASK DETAILS:
Task: "${task.text}"
Due Date: ${task.dueDate || 'Not set'}
Subtasks: ${task.subtasks.length} items

USER CONTEXT:
Role: ${mockUserRole.title}
Department: ${mockUserRole.department}
Current workload: ${mockCalendarContext.upcomingMeetings} meetings this week
Urgent items: ${mockCalendarContext.urgentItems}

PRIORITY LEVELS:
- high: Urgent, deadline-driven, business-critical
- medium: Important but not urgent, moderate impact
- low: Nice to have, low impact, flexible timing

Respond with ONLY a JSON object:
{
  "level": "high|medium|low",
  "reason": "Brief explanation for the priority level",
  "confidence": 0.8
}`;

        try {
            const response = await this.callAzureAI(
                this.aiSettings.endpoint,
                this.aiSettings.apiKey,
                this.aiSettings.model,
                prompt,
                false
            );

            // Try to parse JSON response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return null;
        } catch (error) {
            console.error('Priority suggestion failed:', error);
            return null;
        }
    }

    getMockCalendarContext() {
        // In a real application, this would fetch from Microsoft Graph API
        return {
            upcomingMeetings: Math.floor(Math.random() * 10) + 5,
            urgentItems: Math.floor(Math.random() * 3) + 1,
            availableTime: `${Math.floor(Math.random() * 4) + 2} hours today`,
            nextDeadline: 'Project review tomorrow'
        };
    }

    getMockUserRole() {
        // In a real application, this would be from Azure AD user profile
        return {
            title: 'Software Developer',
            department: 'Engineering',
            level: 'Senior',
            responsibilities: ['Development', 'Code Review', 'Technical Planning']
        };
    }

    // Calendar Integration and Smart Priority System
    initializeCalendarIntegration() {
        this.updatePermissionStatuses();
        this.bindCalendarEvents();
    }

    updatePermissionStatuses() {
        const calendarPermission = localStorage.getItem('calendar_permission') === 'granted';
        const teamsPermission = localStorage.getItem('teams_permission') === 'granted';

        // Update calendar permission status
        const calendarBadge = document.querySelector('#calendar-permission .permission-status-badge');
        const calendarBtn = document.querySelector('#calendar-permission .permission-btn');
        
        if (calendarBadge && calendarBtn) {
            if (calendarPermission) {
                calendarBadge.textContent = 'Connected';
                calendarBadge.classList.add('connected');
                calendarBtn.textContent = 'Disconnect';
            } else {
                calendarBadge.textContent = 'Not Connected';
                calendarBadge.classList.remove('connected');
                calendarBtn.textContent = 'Connect';
            }
        }

        // Update Teams permission status
        const teamsBadge = document.querySelector('#teams-permission .permission-status-badge');
        const teamsBtn = document.querySelector('#teams-permission .permission-btn');
        
        if (teamsBadge && teamsBtn) {
            if (teamsPermission) {
                teamsBadge.textContent = 'Connected';
                teamsBadge.classList.add('connected');
                teamsBtn.textContent = 'Disconnect';
            } else {
                teamsBadge.textContent = 'Not Connected';
                teamsBadge.classList.remove('connected');
                teamsBtn.textContent = 'Connect';
            }
        }
    }

    bindCalendarEvents() {
        const connectCalendar = document.getElementById('connect-calendar');
        const connectTeams = document.getElementById('connect-teams');
        
        if (connectCalendar) {
            connectCalendar.addEventListener('click', () => {
                this.toggleCalendarPermission();
            });
        }

        if (connectTeams) {
            connectTeams.addEventListener('click', () => {
                this.toggleTeamsPermission();
            });
        }
    }

    async toggleCalendarPermission() {
        const currentStatus = localStorage.getItem('calendar_permission') === 'granted';
        
        if (currentStatus) {
            localStorage.removeItem('calendar_permission');
            this.showNotification('Calendar disconnected', 'info');
        } else {
            const granted = await this.requestCalendarPermission();
            if (granted) {
                localStorage.setItem('calendar_permission', 'granted');
                this.showNotification('Calendar connected successfully!', 'success');
            }
        }
        
        this.updatePermissionStatuses();
    }

    async toggleTeamsPermission() {
        const currentStatus = localStorage.getItem('teams_permission') === 'granted';
        
        if (currentStatus) {
            localStorage.removeItem('teams_permission');
            this.showNotification('Teams disconnected', 'info');
        } else {
            const granted = await this.requestTeamsPermission();
            if (granted) {
                localStorage.setItem('teams_permission', 'granted');
                this.showNotification('Teams connected successfully!', 'success');
            }
        }
        
        this.updatePermissionStatuses();
    }

    async requestCalendarPermission() {
        return new Promise(resolve => {
            const result = confirm('This app would like to access your calendar to provide smart priority suggestions based on your schedule. Do you grant permission?');
            setTimeout(() => resolve(result), 500);
        });
    }

    async requestTeamsPermission() {
        return new Promise(resolve => {
            const result = confirm('This app would like to access your Teams data to understand work context for better task prioritization. Do you grant permission?');
            setTimeout(() => resolve(result), 500);
        });
    }

    async suggestSmartPriority(taskText, dueDate) {
        try {
            const calendarContext = await this.getCalendarContext();
            const teamsContext = await this.getTeamsContext();

            if (this.isAIEnabled()) {
                const contextPrompt = this.buildContextPrompt(taskText, dueDate, calendarContext, teamsContext);
                const aiResponse = await this.callAI(contextPrompt);
                return this.parsePriorityResponse(aiResponse);
            }

            return this.calculateRuleBasedPriority(taskText, dueDate, calendarContext, teamsContext);
        } catch (error) {
            console.error('Error suggesting priority:', error);
            return 'medium';
        }
    }

    async getCalendarContext() {
        if (localStorage.getItem('calendar_permission') !== 'granted') {
            return null;
        }

        return {
            upcomingMeetings: [
                { title: 'Project Review', start: new Date(Date.now() + 2 * 60 * 60 * 1000), priority: 'high' },
                { title: 'Team Standup', start: new Date(Date.now() + 24 * 60 * 60 * 1000), priority: 'medium' }
            ],
            currentWorkHours: {
                isWorkingHours: new Date().getHours() >= 9 && new Date().getHours() <= 17,
                timeUntilEndOfDay: 17 - new Date().getHours()
            }
        };
    }

    async getTeamsContext() {
        if (localStorage.getItem('teams_permission') !== 'granted') {
            return null;
        }

        return {
            activeProjects: ['Website Redesign', 'Mobile App', 'API Integration'],
            unreadMessages: 5,
            upcomingDeadlines: [
                { project: 'Website Redesign', deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
            ]
        };
    }

    buildContextPrompt(taskText, dueDate, calendarContext, teamsContext) {
        let prompt = `Analyze this task and suggest a priority (high/medium/low): "${taskText}"`;
        
        if (dueDate) {
            const daysUntilDue = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
            prompt += `\nDue in ${daysUntilDue} days.`;
        }

        if (calendarContext) {
            prompt += `\nCalendar: ${calendarContext.upcomingMeetings.length} meetings, `;
            prompt += `${calendarContext.currentWorkHours.isWorkingHours ? 'work hours' : 'after hours'}.`;
        }

        if (teamsContext) {
            prompt += `\nWork: ${teamsContext.activeProjects.length} projects, ${teamsContext.unreadMessages} messages.`;
        }

        prompt += '\nRespond with only: high, medium, or low';
        return prompt;
    }

    parsePriorityResponse(response) {
        const text = response.toLowerCase();
        if (text.includes('high')) return 'high';
        if (text.includes('low')) return 'low';
        return 'medium';
    }

    calculateRuleBasedPriority(taskText, dueDate, calendarContext, teamsContext) {
        let score = 50;

        if (dueDate) {
            const daysUntilDue = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
            if (daysUntilDue <= 1) score += 30;
            else if (daysUntilDue <= 3) score += 20;
            else if (daysUntilDue <= 7) score += 10;
        }

        if (calendarContext && !calendarContext.currentWorkHours.isWorkingHours) score -= 10;
        if (teamsContext && teamsContext.unreadMessages > 10) score += 10;

        const urgentKeywords = ['urgent', 'asap', 'critical', 'emergency'];
        if (urgentKeywords.some(keyword => taskText.toLowerCase().includes(keyword))) score += 25;

        if (score >= 70) return 'high';
        if (score <= 30) return 'low';
        return 'medium';
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; padding: 12px 20px;
            border-radius: 8px; color: white; font-weight: 600; z-index: 10000;
            transform: translateX(400px); transition: transform 0.3s ease;
        `;

        const colors = { success: '#28a745', error: '#dc3545', info: '#17a2b8', warning: '#ffc107' };
        notification.style.background = colors[type] || colors.info;
        document.body.appendChild(notification);

        setTimeout(() => notification.style.transform = 'translateX(0)', 100);
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TodoApp();
});
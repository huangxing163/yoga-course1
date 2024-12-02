class YogaCourseManager {
    constructor() {
        this.courses = JSON.parse(localStorage.getItem('yogaCourses')) || [];
        this.chart = null;
        this.initializeElements();
        this.initializeEventListeners();
        this.initializeMonthSelector();
        this.renderCourses();
        this.updateTotalHours();
        this.updateLocationStats();
        
        // 延迟初始化图表，确保 DOM 已完全加载
        setTimeout(() => {
            this.initializeCharts();
        }, 100);
    }

    initializeElements() {
        this.form = document.getElementById('yogaForm');
        this.courseList = document.getElementById('courseList');
        this.exportBtn = document.getElementById('exportBtn');
        this.tabItems = document.querySelectorAll('.tab-item');
        this.pages = document.querySelectorAll('.page');
        this.totalHoursElement = document.getElementById('totalHours');
        this.monthSelector = document.getElementById('monthSelector');
        this.locationStats = document.getElementById('locationStats');
        this.chartTabs = document.querySelectorAll('.chart-tab');
    }

    initializeEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.exportBtn.addEventListener('click', () => this.exportToCSV());
        
        // 添加文件导入监听
        document.getElementById('importFile').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.name.endsWith('.csv')) {
                    this.importFromCSV(file);
                } else {
                    this.showNotification('请选择CSV文件！');
                }
                e.target.value = ''; // 清空文件选择器
            }
        });
        
        // 标签切换
        this.tabItems.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab));
        });
        
        // 添加图表切换监听
        this.chartTabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchChart(tab));
        });
    }

    switchTab(tab) {
        // 更新标签状态
        this.tabItems.forEach(item => item.classList.remove('active'));
        tab.classList.add('active');

        // 更新页面显示
        const targetTab = tab.dataset.tab;
        this.pages.forEach(page => {
            page.classList.remove('active');
            if (page.id === `${targetTab}-page`) {
                page.classList.add('active');
            }
        });
    }

    handleSubmit(event) {
        event.preventDefault();
        
        const startTime = document.getElementById('startTime').value;
        const endTime = document.getElementById('endTime').value;
        
        const course = {
            id: Date.now(),
            date: document.getElementById('date').value,
            startTime,
            endTime,
            location: document.getElementById('location').value,
            courseName: document.getElementById('courseName').value,
            duration: 1, // 默认每节课为1课时
            remarks: document.getElementById('remarks').value
        };

        this.courses.push(course);
        this.saveCourses();
        this.renderCourses();
        this.updateLocationStats();
        this.initializeMonthSelector();
        this.updateTotalHours();
        this.form.reset();
        this.showNotification('课程添加成功！');
        
        this.switchTab(document.querySelector('[data-tab="list"]'));
        this.updateMonthlyChart();
    }

    updateTotalHours() {
        const selectedMonth = this.monthSelector.value;
        const [year, month] = selectedMonth.split('-').map(Number);

        // 筛选选定月份的课程
        const monthCourses = this.courses.filter(course => {
            const courseDate = new Date(course.date);
            return courseDate.getFullYear() === year && 
                   courseDate.getMonth() === month - 1;
        });

        // 计算选定月份的总课时
        const total = monthCourses.reduce((sum, course) => sum + course.duration, 0);
        this.totalHoursElement.textContent = total;
    }

    renderCourses() {
        this.courseList.innerHTML = '';
        
        // 获取选中的月份
        const selectedMonth = this.monthSelector.value;
        const [year, month] = selectedMonth.split('-').map(Number);
        
        // 筛选当前选中月份的课程
        const monthCourses = this.courses
            .filter(course => {
                const courseDate = new Date(course.date);
                return courseDate.getFullYear() === year && 
                       courseDate.getMonth() === month - 1;
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        if (monthCourses.length === 0) {
            this.courseList.innerHTML = '<div class="no-data">本月暂无课程记录</div>';
            return;
        }
        
        monthCourses.forEach(course => {
            const card = document.createElement('div');
            card.className = 'course-card';
            card.innerHTML = `
                <div class="course-header">
                    <span class="course-title">${course.courseName}</span>
                    <span class="course-date">${this.formatDate(course.date)}</span>
                </div>
                <div class="course-info">
                    <div class="info-item">
                        <i class="far fa-clock"></i> ${course.startTime} - ${course.endTime}
                    </div>
                    <div class="info-item">
                        <i class="fas fa-map-marker-alt"></i> ${course.location}
                    </div>
                    ${course.remarks ? `
                    <div class="info-item remarks">
                        <i class="fas fa-comment"></i> ${course.remarks}
                    </div>
                    ` : ''}
                </div>
                <div class="course-actions">
                    <button class="btn-delete" onclick="yogaManager.deleteCourse(${course.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            this.courseList.appendChild(card);
        });
    }

    deleteCourse(id) {
        this.courses = this.courses.filter(course => course.id !== id);
        this.saveCourses();
        this.renderCourses();
        this.updateLocationStats();
        this.updateTotalHours();
        this.showNotification('课程删除成功！');
        this.updateMonthlyChart();
    }

    saveCourses() {
        localStorage.setItem('yogaCourses', JSON.stringify(this.courses));
    }

    formatDate(dateString) {
        const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
        return new Date(dateString).toLocaleDateString('zh-CN', options);
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 2000);
    }

    exportToCSV() {
        const headers = ['日期', '开始时间', '结束时间', '地址', '课程名称', '课时', '备注'];
        const csvContent = [
            headers.join(','),
            ...this.courses.map(course => [
                course.date,
                course.startTime,
                course.endTime,
                course.location,
                course.courseName,
                course.duration,
                course.remarks
            ].join(','))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `瑜伽课程记录_${new Date().toLocaleDateString()}.csv`;
        link.click();
    }

    initializeMonthSelector() {
        // 获取所有不重复的年月
        const months = [...new Set(this.courses.map(course => {
            const date = new Date(course.date);
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }))].sort().reverse();

        // 添加当前月份（如果不存在）
        const currentDate = new Date();
        const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        if (!months.includes(currentMonth)) {
            months.unshift(currentMonth);
        }

        // 填充选择器
        this.monthSelector.innerHTML = months.map(month => `
            <option value="${month}">${month.replace('-', '年')}月</option>
        `).join('');

        // 修改月份变化监听器
        this.monthSelector.addEventListener('change', () => {
            this.updateLocationStats();
            this.updateTotalHours();
            this.renderCourses();
        });
    }

    updateLocationStats() {
        const selectedMonth = this.monthSelector.value;
        const [year, month] = selectedMonth.split('-').map(Number);

        // 筛选选定月份的课程
        const monthCourses = this.courses.filter(course => {
            const courseDate = new Date(course.date);
            return courseDate.getFullYear() === year && 
                   courseDate.getMonth() === month - 1;
        });

        // 按地点分组课程
        const locationCourses = {};
        monthCourses.forEach(course => {
            if (!locationCourses[course.location]) {
                locationCourses[course.location] = [];
            }
            locationCourses[course.location].push(course);
        });

        // 渲染统计结果
        this.locationStats.innerHTML = Object.entries(locationCourses)
            .map(([location, courses]) => {
                const totalHours = courses.reduce((sum, course) => sum + course.duration, 0);
                const locationId = `location-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                
                return `
                    <div class="location-stat-card" onclick="yogaManager.toggleLocationDetails('${locationId}')">
                        <div class="location-name">${location}</div>
                        <div class="location-hours">
                            ${totalHours} 课时
                        </div>
                    </div>
                    <div id="${locationId}" class="location-details-container" style="display: none;">
                        ${courses.sort((a, b) => new Date(b.date) - new Date(a.date))
                            .map(course => `
                                <div class="course-detail">
                                    <div class="course-detail-date">${this.formatDate(course.date)}</div>
                                    <div class="course-detail-time">${course.startTime} - ${course.endTime}</div>
                                    <div class="course-detail-name">${course.courseName}</div>
                                    ${course.remarks ? `<div class="course-detail-remarks">${course.remarks}</div>` : ''}
                                </div>
                            `).join('')}
                    </div>
                `;
            }).join('');

        if (Object.keys(locationCourses).length === 0) {
            this.locationStats.innerHTML = '<div class="no-data">本月暂无课程记录</div>';
        }
    }

    exportToJSON() {
        const data = JSON.stringify(this.courses, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `yoga_courses_${new Date().toLocaleDateString()}.json`;
        link.click();
    }

    importFromCSV(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const csv = e.target.result;
                // 处理 CSV 文件的 BOM 标记
                const content = csv.replace(/^\uFEFF/, '');
                // 按行分割
                const lines = content.split('\n');
                // 获取表头
                const headers = lines[0].split(',');
                
                // 解析每一行数据
                const courses = lines.slice(1)
                    .filter(line => line.trim()) // 过滤空行
                    .map(line => {
                        const values = line.split(',');
                        return {
                            id: Date.now() + Math.random(), // 生成唯一ID
                            date: values[0],
                            startTime: values[1],
                            endTime: values[2],
                            location: values[3],
                            courseName: values[4],
                            duration: parseInt(values[5]) || 1,
                            remarks: values[6] || ''
                        };
                    });

                // 合并现有数据和新导入的数据
                this.courses = [...this.courses, ...courses];
                this.saveCourses();
                this.renderCourses();
                this.updateTotalHours();
                this.updateLocationStats();
                this.initializeMonthSelector();
                this.showNotification('数据导入成功！');
                this.updateMonthlyChart();
            } catch (error) {
                console.error('导入错误:', error);
                this.showNotification('数据导入失败！请确保文件格式正确');
            }
        };
        reader.readAsText(file);
    }

    toggleLocationDetails(locationId) {
        const locationCard = document.getElementById(locationId).previousElementSibling;
        const location = locationCard.querySelector('.location-name').textContent;
        
        // 获取选中的月份
        const selectedMonth = this.monthSelector.value;
        const [year, month] = selectedMonth.split('-').map(Number);
        
        // 筛选当前选中月份和地点的课程
        const filteredCourses = this.courses
            .filter(course => {
                const courseDate = new Date(course.date);
                return courseDate.getFullYear() === year && 
                       courseDate.getMonth() === month - 1 &&
                       course.location === location;
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        // 渲染筛选后的课程列表
        this.renderFilteredCourses(filteredCourses, location);
    }

    renderFilteredCourses(courses, location) {
        this.courseList.innerHTML = '';
        
        if (courses.length === 0) {
            this.courseList.innerHTML = '<div class="no-data">没有找到相关课程记录</div>';
            return;
        }

        // 添加标题提示
        const filterTitle = document.createElement('div');
        filterTitle.className = 'filter-title';
        filterTitle.innerHTML = `
            <span>${location}的课程记录</span>
            <button class="btn-clear-filter" onclick="yogaManager.clearFilter()">
                <i class="fas fa-times"></i> 清除筛选
            </button>
        `;
        this.courseList.appendChild(filterTitle);
        
        courses.forEach(course => {
            const card = document.createElement('div');
            card.className = 'course-card';
            card.innerHTML = `
                <div class="course-header">
                    <span class="course-title">${course.courseName}</span>
                    <span class="course-date">${this.formatDate(course.date)}</span>
                </div>
                <div class="course-info">
                    <div class="info-item">
                        <i class="far fa-clock"></i> ${course.startTime} - ${course.endTime}
                    </div>
                    <div class="info-item">
                        <i class="fas fa-map-marker-alt"></i> ${course.location}
                    </div>
                    ${course.remarks ? `
                    <div class="info-item remarks">
                        <i class="fas fa-comment"></i> ${course.remarks}
                    </div>
                    ` : ''}
                </div>
                <div class="course-actions">
                    <button class="btn-delete" onclick="yogaManager.deleteCourse(${course.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            this.courseList.appendChild(card);
        });
    }

    clearFilter() {
        this.renderCourses(); // 恢复显示所有课程
    }

    initializeCharts() {
        const ctx = document.getElementById('statsChart');
        if (!ctx) {
            console.error('找不到图表容器');
            return;
        }

        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(ctx, {
            type: 'doughnut',  // 使用环形图
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [],
                    borderWidth: 1,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            font: {
                                size: 14
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: '课程统计',
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        padding: {
                            top: 10,
                            bottom: 30
                        }
                    }
                }
            }
        });

        // 立即更新图表数据
        this.updateMonthlyChart();
    }

    switchChart(tab) {
        if (!this.chart) return;
        
        this.chartTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const chartType = tab.dataset.chart;
        if (chartType === 'month') {
            this.updateMonthlyChart();
        } else {
            this.updateYearlyChart();
        }
    }

    updateMonthlyChart() {
        if (!this.chart) {
            console.error('图表未初始化');
            return;
        }

        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        
        // 按课程名称统计当月课时
        const courseStats = {};
        
        this.courses.forEach(course => {
            const courseDate = new Date(course.date);
            if (courseDate.getFullYear() === currentYear && 
                courseDate.getMonth() === currentMonth) {
                if (!courseStats[course.courseName]) {
                    courseStats[course.courseName] = 0;
                }
                courseStats[course.courseName] += course.duration;
            }
        });

        const labels = Object.keys(courseStats);
        const data = Object.values(courseStats);
        const colors = labels.map((_, index) => this.getColor(index));

        // 更新图表
        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = data;
        this.chart.data.datasets[0].backgroundColor = colors;
        this.chart.options.plugins.title.text = `${currentYear}年${currentMonth + 1}月课程分布`;
        this.chart.update();

        // 添加课时详情列表
        const detailsContainer = document.createElement('div');
        detailsContainer.className = 'course-details-list';
        detailsContainer.innerHTML = `
            <div class="details-header">课程详情：</div>
            ${labels.map((label, index) => `
                <div class="detail-item">
                    <span class="color-dot" style="background-color: ${colors[index]}"></span>
                    <span class="course-name">${label}</span>
                    <span class="course-hours">${data[index]}课时</span>
                </div>
            `).join('')}
        `;

        // 清除之前的详情列表
        const oldDetails = document.querySelector('.course-details-list');
        if (oldDetails) {
            oldDetails.remove();
        }

        // 添加新的详情列表
        document.querySelector('.chart-container').appendChild(detailsContainer);
    }

    updateYearlyChart() {
        if (!this.chart) {
            console.error('图表未初始化');
            return;
        }

        const currentYear = new Date().getFullYear();
        
        // 按课程名称统计年度课时
        const courseStats = {};
        
        this.courses.forEach(course => {
            const courseDate = new Date(course.date);
            if (courseDate.getFullYear() === currentYear) {
                if (!courseStats[course.courseName]) {
                    courseStats[course.courseName] = 0;
                }
                courseStats[course.courseName] += course.duration;
            }
        });

        const labels = Object.keys(courseStats);
        const data = Object.values(courseStats);
        const colors = labels.map((_, index) => this.getColor(index));

        // 更新图表
        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = data;
        this.chart.data.datasets[0].backgroundColor = colors;
        this.chart.options.plugins.title.text = `${currentYear}年度课程分布`;
        this.chart.update();

        // 添加课时详情列表
        const detailsContainer = document.createElement('div');
        detailsContainer.className = 'course-details-list';
        detailsContainer.innerHTML = `
            <div class="details-header">课程详情：</div>
            ${labels.map((label, index) => `
                <div class="detail-item">
                    <span class="color-dot" style="background-color: ${colors[index]}"></span>
                    <span class="course-name">${label}</span>
                    <span class="course-hours">${data[index]}课时</span>
                </div>
            `).join('')}
        `;

        // 清除之前的详情列表
        const oldDetails = document.querySelector('.course-details-list');
        if (oldDetails) {
            oldDetails.remove();
        }

        // 添加新的详情列表
        document.querySelector('.chart-container').appendChild(detailsContainer);
    }

    // 添加颜色生成方法
    getColor(index) {
        const colors = [
            'rgba(74, 144, 226, 0.6)',   // 蓝色
            'rgba(92, 184, 92, 0.6)',    // 绿色
            'rgba(240, 173, 78, 0.6)',   // 橙色
            'rgba(217, 83, 79, 0.6)',    // 红色
            'rgba(156, 39, 176, 0.6)',   // 紫色
            'rgba(0, 188, 212, 0.6)',    // 青色
            'rgba(255, 152, 0, 0.6)',    // 橙黄色
            'rgba(233, 30, 99, 0.6)'     // 粉色
        ];
        return colors[index % colors.length];
    }

    // 修改 clearAllData 方法
    clearAllData() {
        // 显示模态框
        const modal = document.getElementById('confirmModal');
        modal.style.display = 'flex';
        
        // 清空并聚焦输入框
        const input = document.getElementById('confirmInput');
        input.value = '';
        input.focus();
    }

    // 添加关闭模态框方法
    closeModal() {
        const modal = document.getElementById('confirmModal');
        modal.style.display = 'none';
    }

    // 添加确认删除方法
    confirmDelete() {
        const input = document.getElementById('confirmInput');
        const confirmName = input.value.trim();
        
        if (confirmName === '周开妍') {
            // 清除数据
            this.courses = [];
            localStorage.removeItem('yogaCourses');
            
            // 更新界面
            this.renderCourses();
            this.updateTotalHours();
            this.updateLocationStats();
            this.initializeMonthSelector();
            
            // 关闭模态框并显示提示
            this.closeModal();
            this.showNotification('所有数据已清除');
        } else {
            this.showNotification('输入错误，删除取消');
        }
    }
}

// 等待 DOM 加载完成后再初始化
document.addEventListener('DOMContentLoaded', () => {
    window.yogaManager = new YogaCourseManager();
});
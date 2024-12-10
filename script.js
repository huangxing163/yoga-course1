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
        this.initializeCalendar();
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
        
        // 选当前选中月份的课程
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

    deleteCourse(courseId) {
        Swal.fire({
            title: '删除确认',
            text: '确定要删除这条记录吗？',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: '删除',
            cancelButtonText: '取消',
            customClass: {
                popup: 'swal-custom-popup',
                title: 'swal-custom-title',
                content: 'swal-custom-content',
                confirmButton: 'swal-custom-confirm',
                cancelButton: 'swal-custom-cancel'
            },
            buttonsStyling: false,
            reverseButtons: true
        }).then((result) => {
            if (result.isConfirmed) {
                const index = this.courses.findIndex(course => course.id === courseId);
                if (index !== -1) {
                    this.courses.splice(index, 1);
                    this.saveCourses();
                    
                    // 更新所有相关显示
                    this.renderCourses();
                    this.updateLocationStats();
                    this.updateTotalHours();
                    this.updateMonthlyChart();
                    
                    // 更新课表相关显示
                    this.renderCalendar();
                    this.updateScheduleDisplay();
                    
                    this.showNotification('课程删除成功！');
                }
            }
        });
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

        // 改月份变化监听器
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
        
        // 获取选��的月份
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

    initializeCalendar() {
        this.currentDate = new Date();
        this.selectedDate = null;
        
        document.getElementById('prevMonth').addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('nextMonth').addEventListener('click', () => this.changeMonth(1));
        document.getElementById('btnAddSchedule').addEventListener('click', () => this.openScheduleModal());
        document.getElementById('scheduleForm').addEventListener('submit', (e) => this.handleScheduleSubmit(e));
        
        this.renderCalendar();
    }

    renderCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // 更新月份显示
        document.getElementById('currentMonth').textContent = 
            `${year}年${month + 1}月`;
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();
        
        const calendarDays = document.getElementById('calendarDays');
        calendarDays.innerHTML = '';
        
        // 添加空白天数
        for (let i = 0; i < startingDay; i++) {
            calendarDays.appendChild(this.createDayElement(''));
        }
        
        // 添加月份天数
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dayElement = this.createDayElement(day, date);
            calendarDays.appendChild(dayElement);
        }
        
        this.updateScheduleDisplay();
    }

    createDayElement(day, date) {
        const div = document.createElement('div');
        div.className = 'calendar-day';
        
        if (day) {
            div.textContent = day;
            
            // 检查是否是今天
            const today = new Date();
            if (date.toDateString() === today.toDateString()) {
                div.classList.add('today');
            }
            
            // 检查是否有课程
            const schedules = this.getSchedulesForDate(date);
            if (schedules.length > 0) {
                div.classList.add('has-schedule');
                const count = document.createElement('span');
                count.className = 'schedule-count';
                count.textContent = schedules.length;
                div.appendChild(count);
            }
            
            div.addEventListener('click', () => this.selectDate(date));
        }
        
        return div;
    }

    changeMonth(delta) {
        this.currentDate.setMonth(this.currentDate.getMonth() + delta);
        this.renderCalendar();
    }

    selectDate(date) {
        this.selectedDate = date;
        this.renderCalendar();
        this.updateScheduleDisplay();
        
        // 更新选中状态
        document.querySelectorAll('.calendar-day').forEach(day => {
            day.classList.remove('selected');
            if (day.textContent && new Date(this.selectedDate).getDate() === parseInt(day.textContent)) {
                day.classList.add('selected');
            }
        });
    }

    getSchedulesForDate(date) {
        return this.courses.filter(course => {
            const courseDate = new Date(course.date);
            return courseDate.toDateString() === date.toDateString();
        });
    }

    updateScheduleDisplay() {
        const scheduleList = document.querySelector('.schedule-list');
        const scheduleDate = document.querySelector('.schedule-date');
        
        if (!this.selectedDate) {
            scheduleList.innerHTML = '<div class="no-data">请选择日期查看课程安排</div>';
            scheduleDate.textContent = '';
            return;
        }
        
        scheduleDate.textContent = this.selectedDate.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });
        
        const schedules = this.getSchedulesForDate(this.selectedDate);
        if (schedules.length === 0) {
            scheduleList.innerHTML = '<div class="no-data">当天暂无课程安排</div>';
            return;
        }
        
        scheduleList.innerHTML = schedules
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
            .map(schedule => `
                <div class="schedule-item">
                    <div class="schedule-time">
                        <i class="far fa-clock"></i> ${schedule.startTime} - ${schedule.endTime}
                    </div>
                    <div class="schedule-course">
                        <i class="fas fa-book"></i> ${schedule.courseName}
                    </div>
                    <div class="schedule-location">
                        <i class="fas fa-map-marker-alt"></i> ${schedule.location}
                    </div>
                    ${schedule.remarks ? `
                    <div class="schedule-remarks">
                        <i class="fas fa-comment"></i> ${schedule.remarks}
                    </div>
                    ` : ''}
                    <div class="schedule-actions">
                        <button class="btn-delete" onclick="yogaManager.deleteCourse(${schedule.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
    }

    openScheduleModal() {
        if (!this.selectedDate) {
            this.showNotification('请先选择日期');
            return;
        }
        
        // 检查是否是过去的日期
        const today = new Date();
        today.setHours(0, 0, 0, 0); // 设置时间为当天始
        
        const selectedDate = new Date(this.selectedDate);
        selectedDate.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
            this.showNotification('无法为过去的日期添加预约');
            return;
        }
        
        const modal = document.getElementById('scheduleModal');
        modal.style.display = 'flex';
    }

    closeScheduleModal() {
        const modal = document.getElementById('scheduleModal');
        modal.style.display = 'none';
        document.getElementById('scheduleForm').reset();
    }

    handleScheduleSubmit(event) {
        event.preventDefault();
        
        const startTime = document.getElementById('scheduleStartTime').value;
        const endTime = document.getElementById('scheduleEndTime').value;
        
        // 检查时间是否合法
        const now = new Date();
        const selectedDate = new Date(this.selectedDate);
        const scheduleDateTime = new Date(selectedDate);
        
        // 设置预约时间
        const [startHours, startMinutes] = startTime.split(':').map(Number);
        scheduleDateTime.setHours(startHours, startMinutes, 0);
        
        // 如果是今天，需要比较完整的时间（时和分）
        if (selectedDate.toDateString() === now.toDateString()) {
            // 获取当前的小时和分钟
            const currentHours = now.getHours();
            const currentMinutes = now.getMinutes();
            
            // 将时间转换为分钟数进行比较
            const currentTotalMinutes = currentHours * 60 + currentMinutes;
            const scheduleTotalMinutes = startHours * 60 + startMinutes;
            
            if (scheduleTotalMinutes <= currentTotalMinutes) {
                this.showNotification('无法预约过去或当前的时间');
                return;
            }
        }
        
        // 修复日期时区问题
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        
        const course = {
            id: Date.now(),
            date: dateString,
            startTime: startTime,
            endTime: endTime,
            location: document.getElementById('scheduleLocation').value,
            courseName: document.getElementById('studentName').value,
            duration: 1,
            remarks: document.getElementById('scheduleRemarks').value,
            isScheduled: true
        };
        
        this.courses.push(course);
        this.saveCourses();
        
        // 更新所有相关显示
        this.renderCalendar();
        this.updateScheduleDisplay();
        this.renderCourses();
        this.updateLocationStats();
        this.updateTotalHours();
        this.initializeMonthSelector();
        
        this.closeScheduleModal();
        this.showNotification('预约添加成功！');
    }

    // 显示批量添加模态框
    showBatchAddModal() {
        const modal = document.getElementById('batchAddModal');
        modal.style.display = 'flex';
        
        // 设置默认的开始月份为当前月份
        const today = new Date();
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        document.getElementById('startMonth').value = `${year}-${month}`;
    }

    // 关闭批量添加模态框
    closeBatchAddModal() {
        const modal = document.getElementById('batchAddModal');
        modal.style.display = 'none';
        
        // 清空输入
        document.getElementById('batchCourses').value = '';
        document.getElementById('repeatMonths').value = '1';
    }

    // 处理批量添加逻辑
    processBatchAdd() {
        const coursesText = document.getElementById('batchCourses').value.trim();
        const startMonth = document.getElementById('startMonth').value;
        const repeatMonths = parseInt(document.getElementById('repeatMonths').value);

        if (!coursesText || !startMonth) {
            Swal.fire('错误', '请填写课程信息和开始月份', 'error');
            return;
        }

        try {
            // 解析课程数据
            const courseLines = coursesText.split('\n').filter(line => line.trim());
            const weekdayMap = {
                '周日': 0, '周一': 1, '周二': 2, '周三': 3,
                '周四': 4, '周五': 5, '周六': 6
            };

            // 获取开始月份的第一天
            const startDate = new Date(`${startMonth}-01`);
            const courses = [];

            // 获取明天凌晨的日期时间
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            
            // 获取今天的日期（用于比较）
            const today = new Date();
            today.setHours(23, 59, 59, 999); // 设置为今天的最后一毫秒

            // 循环处理每个月
            for (let month = 0; month < repeatMonths; month++) {
                const currentMonth = new Date(startDate);
                currentMonth.setMonth(currentMonth.getMonth() + month);
                
                // 处理每行课程信息
                courseLines.forEach(line => {
                    const parts = line.split('-');
                    if (parts.length < 6) {
                        throw new Error(`格式错误: ${line}\n正确格式：星期几-开始时间-结束时间-地点-课程名称-课时`);
                    }

                    const [weekday, startTime, endTime, location, courseName, duration] = parts;
                    const weekdayNum = weekdayMap[weekday];

                    if (weekdayNum === undefined) {
                        throw new Error(`无效的星期格式: ${weekday}`);
                    }

                    // 验证课时是否为数字
                    const durationNum = parseInt(duration);
                    if (isNaN(durationNum)) {
                        throw new Error(`无效的课时格式: ${duration}`);
                    }

                    // 找到当月第一个对应的星期几，使用 currentMonth 替代 monthStartDate
                    const firstDay = new Date(currentMonth);
                    while (firstDay.getDay() !== weekdayNum) {
                        firstDay.setDate(firstDay.getDate() + 1);
                    }

                    // 如果第一天不晚于今天，找到下一个符合条件的日期
                    while (firstDay.getTime() <= today.getTime()) {
                        firstDay.setDate(firstDay.getDate() + 7);
                    }

                    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);
                    let currentDate = new Date(firstDay);

                    // 只有当起始日期不超过月末时才进行处理
                    if (currentDate.getMonth() === currentMonth.getMonth()) {
                        do {
                            // 确保日期晚于今天
                            if (currentDate.getTime() > today.getTime()) {
                                const courseDate = currentDate.toISOString().split('T')[0];
                                
                                courses.push({
                                    id: Date.now() + Math.random(),
                                    date: courseDate,
                                    startTime,
                                    endTime,
                                    location,
                                    courseName,
                                    duration: durationNum,
                                    remarks: ''
                                });
                            }

                            // 增加7天
                            currentDate.setDate(currentDate.getDate() + 7);
                        } while (currentDate.getTime() <= lastDay.getTime() && 
                                currentDate.getMonth() === currentMonth.getMonth());
                    }
                });
            }

            // 保存课程到本地存储
            const existingCourses = JSON.parse(localStorage.getItem('yogaCourses')) || [];
            const updatedCourses = [...existingCourses, ...courses];
            localStorage.setItem('yogaCourses', JSON.stringify(updatedCourses));

            // 更新当前实例的课程数据
            this.courses = updatedCourses;

            // 关闭模态框并显示成功消息
            this.closeBatchAddModal();
            Swal.fire('成功', `已添加 ${courses.length} 节课程`, 'success');
            
            // 更新显示
            this.renderCourses();
            this.updateTotalHours();
            this.updateLocationStats();
            this.initializeMonthSelector();

        } catch (error) {
            Swal.fire('错误', error.message, 'error');
        }
    }
}

// 等待 DOM 加载完成后再初始化
document.addEventListener('DOMContentLoaded', () => {
    window.yogaManager = new YogaCourseManager();
});
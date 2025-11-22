/**
 * LoanWise Pro - Professional Loan Calculator
 *
 * Three-Layer Architecture Implementation:
 *
 * 1. DATA LAYER (DataLayer class)
 *    - Handles user input collection
 *    - Validates and sanitizes data
 *    - Manages local storage for persistence
 *
 * 2. PROCESSING LAYER (ProcessingLayer class)
 *    - Calculates monthly payments using standard amortization formula
 *    - Generates complete amortization schedules
 *    - Computes summary statistics (total interest, total cost, ratios)
 *
 * 3. UI LAYER (UILayer class)
 *    - Updates DOM elements with calculated results
 *    - Renders charts and visualizations
 *    - Handles user interactions and form submissions
 */

// ============================================
// DATA LAYER
// Responsible for data input, validation, and storage
// ============================================

class DataLayer {
    constructor() {
        this.storageKey = 'loanwise_data';
    }

    /**
     * Collects loan data from form inputs
     * @returns {Object} Loan parameters
     */
    collectFormData() {
        const loanAmount = this.parseNumber(document.getElementById('loanAmount').value);
        const interestRate = this.parseNumber(document.getElementById('interestRate').value);
        const loanTerm = this.parseNumber(document.getElementById('loanTerm').value);
        const startDate = document.getElementById('startDate').value || this.getCurrentMonth();

        return {
            loanAmount,
            interestRate,
            loanTerm,
            startDate
        };
    }

    /**
     * Parses a string to a number, removing formatting
     * @param {string} value - The input value
     * @returns {number} Parsed number
     */
    parseNumber(value) {
        if (typeof value === 'number') return value;
        // Remove commas and non-numeric characters except decimal point
        const cleaned = String(value).replace(/[^0-9.]/g, '');
        return parseFloat(cleaned) || 0;
    }

    /**
     * Validates loan data
     * @param {Object} data - Loan parameters
     * @returns {Object} Validation result
     */
    validateData(data) {
        const errors = [];

        if (data.loanAmount <= 0) {
            errors.push('Loan amount must be greater than zero');
        }
        if (data.loanAmount > 100000000) {
            errors.push('Loan amount exceeds maximum limit');
        }
        if (data.interestRate < 0) {
            errors.push('Interest rate cannot be negative');
        }
        if (data.interestRate > 50) {
            errors.push('Interest rate exceeds reasonable limit');
        }
        if (data.loanTerm <= 0) {
            errors.push('Loan term must be greater than zero');
        }
        if (data.loanTerm > 50) {
            errors.push('Loan term exceeds maximum of 50 years');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Gets the current month in YYYY-MM format
     * @returns {string} Current month
     */
    getCurrentMonth() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }

    /**
     * Saves loan data to local storage
     * @param {Object} data - Loan parameters
     */
    saveToStorage(data) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (e) {
            console.warn('Could not save to localStorage:', e);
        }
    }

    /**
     * Loads loan data from local storage
     * @returns {Object|null} Saved loan parameters
     */
    loadFromStorage() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            console.warn('Could not load from localStorage:', e);
            return null;
        }
    }
}

// ============================================
// PROCESSING LAYER
// Responsible for all loan calculations
// ============================================

class ProcessingLayer {
    /**
     * Calculates the monthly payment using the standard amortization formula
     * Formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
     *
     * @param {number} principal - Loan amount
     * @param {number} annualRate - Annual interest rate (percentage)
     * @param {number} years - Loan term in years
     * @returns {number} Monthly payment amount
     */
    calculateMonthlyPayment(principal, annualRate, years) {
        // Convert annual rate to monthly rate (decimal)
        const monthlyRate = (annualRate / 100) / 12;
        // Total number of payments
        const numPayments = years * 12;

        // Handle edge case of 0% interest
        if (monthlyRate === 0) {
            return principal / numPayments;
        }

        // Standard amortization formula
        const numerator = monthlyRate * Math.pow(1 + monthlyRate, numPayments);
        const denominator = Math.pow(1 + monthlyRate, numPayments) - 1;

        return principal * (numerator / denominator);
    }

    /**
     * Generates a complete amortization schedule
     * @param {number} principal - Loan amount
     * @param {number} annualRate - Annual interest rate (percentage)
     * @param {number} years - Loan term in years
     * @param {string} startDate - Start date in YYYY-MM format
     * @returns {Array} Array of payment objects
     */
    generateAmortizationSchedule(principal, annualRate, years, startDate) {
        const schedule = [];
        const monthlyPayment = this.calculateMonthlyPayment(principal, annualRate, years);
        const monthlyRate = (annualRate / 100) / 12;
        const numPayments = years * 12;

        let balance = principal;
        let currentDate = new Date(startDate + '-01');

        for (let i = 1; i <= numPayments; i++) {
            // Calculate interest for this period
            const interestPayment = balance * monthlyRate;
            // Calculate principal for this period
            const principalPayment = monthlyPayment - interestPayment;
            // Update balance
            balance -= principalPayment;

            // Handle floating point precision for final payment
            if (i === numPayments) {
                balance = 0;
            }

            schedule.push({
                paymentNumber: i,
                date: this.formatDate(currentDate),
                payment: monthlyPayment,
                principal: principalPayment,
                interest: interestPayment,
                balance: Math.max(0, balance)
            });

            // Move to next month
            currentDate.setMonth(currentDate.getMonth() + 1);
        }

        return schedule;
    }

    /**
     * Calculates summary statistics for the loan
     * @param {number} principal - Loan amount
     * @param {number} annualRate - Annual interest rate (percentage)
     * @param {number} years - Loan term in years
     * @returns {Object} Summary statistics
     */
    calculateSummary(principal, annualRate, years) {
        const monthlyPayment = this.calculateMonthlyPayment(principal, annualRate, years);
        const totalPayments = years * 12;
        const totalCost = monthlyPayment * totalPayments;
        const totalInterest = totalCost - principal;
        const interestRatio = (totalInterest / totalCost) * 100;

        return {
            monthlyPayment,
            totalPayments,
            principal,
            totalInterest,
            totalCost,
            interestRatio
        };
    }

    /**
     * Formats a date object to a readable string
     * @param {Date} date - Date object
     * @returns {string} Formatted date string
     */
    formatDate(date) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[date.getMonth()]} ${date.getFullYear()}`;
    }
}

// ============================================
// UI LAYER
// Responsible for all DOM manipulation and user interaction
// ============================================

class UILayer {
    constructor() {
        this.chartCanvas = document.getElementById('paymentChart');
        this.chartCtx = this.chartCanvas ? this.chartCanvas.getContext('2d') : null;
        this.showFullSchedule = false;
    }

    /**
     * Formats a number as currency
     * @param {number} amount - Amount to format
     * @returns {string} Formatted currency string
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }

    /**
     * Formats a number with commas (no currency symbol)
     * @param {number} amount - Amount to format
     * @returns {string} Formatted number string
     */
    formatNumber(amount) {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    /**
     * Formats a percentage
     * @param {number} value - Percentage value
     * @returns {string} Formatted percentage string
     */
    formatPercent(value) {
        return value.toFixed(1) + '%';
    }

    /**
     * Updates all result displays
     * @param {Object} summary - Calculation summary
     */
    updateResults(summary) {
        // Animate number updates
        this.animateValue('monthlyPayment', this.formatCurrency(summary.monthlyPayment));
        this.animateValue('termDisplay', summary.totalPayments);
        this.animateValue('principalAmount', this.formatCurrency(summary.principal));
        this.animateValue('totalInterest', this.formatCurrency(summary.totalInterest));
        this.animateValue('totalCost', this.formatCurrency(summary.totalCost));
        this.animateValue('interestRatio', this.formatPercent(summary.interestRatio));
        this.animateValue('totalMonths', summary.totalPayments);
    }

    /**
     * Animates a value update with a brief highlight
     * @param {string} elementId - Target element ID
     * @param {string|number} newValue - New value to display
     */
    animateValue(elementId, newValue) {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.classList.add('animate-number');
        element.textContent = newValue;

        // Trigger reflow for animation
        element.style.opacity = '0';
        element.style.transform = 'translateY(-5px)';

        requestAnimationFrame(() => {
            element.style.transition = 'all 0.3s ease-out';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        });
    }

    /**
     * Renders the amortization schedule table
     * @param {Array} schedule - Amortization schedule data
     */
    renderAmortizationTable(schedule) {
        const tbody = document.getElementById('amortizationBody');
        if (!tbody) return;

        // Clear existing rows
        tbody.innerHTML = '';

        // Determine how many rows to show
        const rowsToShow = this.showFullSchedule ? schedule.length : Math.min(12, schedule.length);

        // Create table rows
        for (let i = 0; i < rowsToShow; i++) {
            const row = schedule[i];
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.paymentNumber}</td>
                <td>${row.date}</td>
                <td>${this.formatCurrency(row.payment)}</td>
                <td>${this.formatCurrency(row.principal)}</td>
                <td>${this.formatCurrency(row.interest)}</td>
                <td>${this.formatCurrency(row.balance)}</td>
            `;
            tbody.appendChild(tr);
        }

        // Update footer text
        const tableFooter = document.getElementById('tableFooter');
        const toggleText = document.getElementById('toggleText');

        if (this.showFullSchedule || schedule.length <= 12) {
            if (tableFooter) tableFooter.style.display = 'none';
        } else {
            if (tableFooter) tableFooter.style.display = 'block';
        }

        if (toggleText) {
            toggleText.textContent = this.showFullSchedule ? 'Show Less' : 'Show Full Schedule';
        }
    }

    /**
     * Renders a donut chart showing principal vs interest breakdown
     * @param {number} principal - Principal amount
     * @param {number} interest - Total interest amount
     */
    renderChart(principal, interest) {
        if (!this.chartCtx) return;

        const canvas = this.chartCanvas;
        const ctx = this.chartCtx;

        // Set canvas size for high DPI displays
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        // Chart dimensions
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const outerRadius = Math.min(centerX, centerY) - 10;
        const innerRadius = outerRadius * 0.6;

        // Calculate angles
        const total = principal + interest;
        const principalAngle = (principal / total) * 2 * Math.PI;
        const interestAngle = (interest / total) * 2 * Math.PI;

        // Clear canvas
        ctx.clearRect(0, 0, rect.width, rect.height);

        // Draw principal segment
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius, -Math.PI / 2, -Math.PI / 2 + principalAngle);
        ctx.arc(centerX, centerY, innerRadius, -Math.PI / 2 + principalAngle, -Math.PI / 2, true);
        ctx.closePath();
        ctx.fillStyle = '#2d5a94';
        ctx.fill();

        // Draw interest segment
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius, -Math.PI / 2 + principalAngle, -Math.PI / 2 + principalAngle + interestAngle);
        ctx.arc(centerX, centerY, innerRadius, -Math.PI / 2 + principalAngle + interestAngle, -Math.PI / 2 + principalAngle, true);
        ctx.closePath();
        ctx.fillStyle = '#d4a017';
        ctx.fill();

        // Draw center text
        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const principalPercent = ((principal / total) * 100).toFixed(0);
        ctx.fillText(`${principalPercent}%`, centerX, centerY - 8);

        ctx.font = '12px Inter, sans-serif';
        ctx.fillStyle = '#6b7280';
        ctx.fillText('Principal', centerX, centerY + 12);
    }

    /**
     * Sets form input values
     * @param {Object} data - Form data
     */
    setFormValues(data) {
        const loanAmountInput = document.getElementById('loanAmount');
        const interestRateInput = document.getElementById('interestRate');
        const loanTermInput = document.getElementById('loanTerm');
        const startDateInput = document.getElementById('startDate');
        const loanAmountSlider = document.getElementById('loanAmountSlider');
        const interestRateSlider = document.getElementById('interestRateSlider');
        const loanTermSlider = document.getElementById('loanTermSlider');

        if (loanAmountInput) loanAmountInput.value = this.formatNumber(data.loanAmount);
        if (interestRateInput) interestRateInput.value = data.interestRate;
        if (loanTermInput) loanTermInput.value = data.loanTerm;
        if (startDateInput) startDateInput.value = data.startDate;

        if (loanAmountSlider) loanAmountSlider.value = data.loanAmount;
        if (interestRateSlider) interestRateSlider.value = data.interestRate;
        if (loanTermSlider) loanTermSlider.value = data.loanTerm;
    }

    /**
     * Shows validation errors to the user
     * @param {Array} errors - Array of error messages
     */
    showErrors(errors) {
        alert('Please correct the following:\n\n' + errors.join('\n'));
    }

    /**
     * Toggles the full amortization schedule display
     */
    toggleFullSchedule() {
        this.showFullSchedule = !this.showFullSchedule;
    }

    /**
     * Generates CSV content from amortization schedule
     * @param {Array} schedule - Amortization schedule
     * @param {Object} summary - Loan summary
     * @returns {string} CSV content
     */
    generateCSV(schedule, summary) {
        let csv = 'LoanWise Pro - Amortization Schedule\n';
        csv += `Principal,${summary.principal}\n`;
        csv += `Monthly Payment,${summary.monthlyPayment.toFixed(2)}\n`;
        csv += `Total Interest,${summary.totalInterest.toFixed(2)}\n`;
        csv += `Total Cost,${summary.totalCost.toFixed(2)}\n\n`;
        csv += 'Payment #,Date,Payment,Principal,Interest,Balance\n';

        schedule.forEach(row => {
            csv += `${row.paymentNumber},${row.date},${row.payment.toFixed(2)},${row.principal.toFixed(2)},${row.interest.toFixed(2)},${row.balance.toFixed(2)}\n`;
        });

        return csv;
    }

    /**
     * Downloads a file
     * @param {string} content - File content
     * @param {string} filename - File name
     * @param {string} mimeType - MIME type
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

// ============================================
// APPLICATION CONTROLLER
// Coordinates the three layers
// ============================================

class LoanCalculatorApp {
    constructor() {
        // Initialize the three layers
        this.dataLayer = new DataLayer();
        this.processingLayer = new ProcessingLayer();
        this.uiLayer = new UILayer();

        // Store current calculation results
        this.currentSchedule = [];
        this.currentSummary = null;

        // Initialize the application
        this.init();
    }

    /**
     * Initializes the application
     */
    init() {
        // Set up event listeners
        this.setupEventListeners();

        // Load saved data or set defaults
        this.loadSavedData();

        // Perform initial calculation
        this.calculate();

        // Log architecture info to console
        console.log('%c LoanWise Pro - Three-Layer Architecture ', 'background: #2d5a94; color: white; padding: 10px; font-size: 14px;');
        console.log('%c Data Layer: ', 'color: #059669; font-weight: bold;', 'Handles user input and data validation');
        console.log('%c Processing Layer: ', 'color: #d4a017; font-weight: bold;', 'Performs all loan calculations');
        console.log('%c UI Layer: ', 'color: #2d5a94; font-weight: bold;', 'Manages display and user interaction');
    }

    /**
     * Sets up all event listeners
     */
    setupEventListeners() {
        // Form submission
        const form = document.getElementById('loanForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.calculate();
            });
        }

        // Slider synchronization
        this.setupSliderSync('loanAmount', 'loanAmountSlider', true);
        this.setupSliderSync('interestRate', 'interestRateSlider', false);
        this.setupSliderSync('loanTerm', 'loanTermSlider', false);

        // Input formatting
        const loanAmountInput = document.getElementById('loanAmount');
        if (loanAmountInput) {
            loanAmountInput.addEventListener('blur', (e) => {
                const value = this.dataLayer.parseNumber(e.target.value);
                if (value > 0) {
                    e.target.value = this.uiLayer.formatNumber(value);
                }
            });
        }

        // Toggle schedule button
        const toggleBtn = document.getElementById('toggleSchedule');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.uiLayer.toggleFullSchedule();
                this.uiLayer.renderAmortizationTable(this.currentSchedule);
            });
        }

        // Export CSV button
        const exportBtn = document.getElementById('exportCSV');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                if (this.currentSchedule.length > 0 && this.currentSummary) {
                    const csv = this.uiLayer.generateCSV(this.currentSchedule, this.currentSummary);
                    this.uiLayer.downloadFile(csv, 'loan-amortization-schedule.csv', 'text/csv');
                }
            });
        }

        // Real-time calculation on input change
        const inputs = ['loanAmount', 'interestRate', 'loanTerm', 'startDate'];
        inputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('change', () => this.calculate());
            }
        });

        // Window resize handler for chart
        window.addEventListener('resize', () => {
            if (this.currentSummary) {
                this.uiLayer.renderChart(
                    this.currentSummary.principal,
                    this.currentSummary.totalInterest
                );
            }
        });
    }

    /**
     * Sets up synchronization between input and slider
     * @param {string} inputId - Input element ID
     * @param {string} sliderId - Slider element ID
     * @param {boolean} formatAsNumber - Whether to format as number with commas
     */
    setupSliderSync(inputId, sliderId, formatAsNumber) {
        const input = document.getElementById(inputId);
        const slider = document.getElementById(sliderId);

        if (input && slider) {
            // Slider changes update input
            slider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                input.value = formatAsNumber ? this.uiLayer.formatNumber(value) : value;
            });

            slider.addEventListener('change', () => {
                this.calculate();
            });

            // Input changes update slider
            input.addEventListener('input', (e) => {
                const value = this.dataLayer.parseNumber(e.target.value);
                if (value >= parseFloat(slider.min) && value <= parseFloat(slider.max)) {
                    slider.value = value;
                }
            });
        }
    }

    /**
     * Loads saved data from storage
     */
    loadSavedData() {
        const savedData = this.dataLayer.loadFromStorage();

        if (savedData) {
            this.uiLayer.setFormValues(savedData);
        } else {
            // Set default values
            const defaults = {
                loanAmount: 250000,
                interestRate: 6.5,
                loanTerm: 30,
                startDate: this.dataLayer.getCurrentMonth()
            };
            this.uiLayer.setFormValues(defaults);
        }
    }

    /**
     * Main calculation method - coordinates all three layers
     */
    calculate() {
        // STEP 1: DATA LAYER - Collect and validate input
        const data = this.dataLayer.collectFormData();
        const validation = this.dataLayer.validateData(data);

        if (!validation.isValid) {
            this.uiLayer.showErrors(validation.errors);
            return;
        }

        // Save valid data
        this.dataLayer.saveToStorage(data);

        // STEP 2: PROCESSING LAYER - Perform calculations
        this.currentSummary = this.processingLayer.calculateSummary(
            data.loanAmount,
            data.interestRate,
            data.loanTerm
        );

        this.currentSchedule = this.processingLayer.generateAmortizationSchedule(
            data.loanAmount,
            data.interestRate,
            data.loanTerm,
            data.startDate
        );

        // STEP 3: UI LAYER - Update display
        this.uiLayer.updateResults(this.currentSummary);
        this.uiLayer.renderAmortizationTable(this.currentSchedule);
        this.uiLayer.renderChart(
            this.currentSummary.principal,
            this.currentSummary.totalInterest
        );
    }
}

// ============================================
// INITIALIZE APPLICATION
// ============================================

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    // Create and start the application
    window.loanApp = new LoanCalculatorApp();
});

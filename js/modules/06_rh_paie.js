// js/modules/06_rh_paie.js
import { getEmployees, getAttendance, getLeaves, getPayroll, createEmployee } from '../../services/hrService.js';
import { formatCurrency } from '../../utils/currency.js';

const COMPANY_ID = 'demo_company_001';

export async function initRH() {
    const employees = await getEmployees(COMPANY_ID);
    const leaves = await getLeaves(COMPANY_ID);
    const payroll = await getPayroll(COMPANY_ID);

    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(e => e.status === 'Actif').length;
    const onLeaveEmployees = employees.filter(e => e.status === 'En congé').length;

    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7);
    const monthlyPayroll = payroll
        .filter(p => p.period && p.period.startsWith(currentMonth))
        .reduce((sum, p) => sum + (p.netPay || 0), 0);

    const attendance = await getAttendance(COMPANY_ID);
    const totalOvertime = attendance
        .filter(a => a.date && a.date.toDate().toISOString().split('T')[0].startsWith(currentMonth))
        .reduce((sum, a) => sum + (a.overtimeHours || 0), 0);

    document.getElementById('totalEmployees').textContent = totalEmployees;
    document.getElementById('activeEmployees').textContent = activeEmployees;
    document.getElementById('onLeaveEmployees').textContent = onLeaveEmployees;
    document.getElementById('monthlyPayroll').textContent = formatCurrency(monthlyPayroll);
    document.getElementById('totalOvertime').textContent = totalOvertime + 'h';

    createCharts(employees, payroll);
}

function createCharts(employees, payroll) {
    const ctxSalary = document.getElementById('rhSalaryChart')?.getContext('2d');
    if (ctxSalary) {
        new Chart(ctxSalary, {
            type: 'line',
            data: {
                labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
                datasets: [{
                    label: 'Salè (k HTG)',
                    data: [1100, 1150, 1200, 1180, 1240, 1240],
                    borderColor: '#4F46E5',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(79,70,229,0.1)'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    const ctxDept = document.getElementById('rhDeptChart')?.getContext('2d');
    if (ctxDept) {
        const deptCounts = {};
        employees.forEach(emp => {
            const dept = emp.department || 'Lòt';
            deptCounts[dept] = (deptCounts[dept] || 0) + 1;
        });
        const labels = Object.keys(deptCounts);
        const data = Object.values(deptCounts);

        new Chart(ctxDept, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{ data: data, backgroundColor: ['#4F46E5', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6'] }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
}

// --- MODAL FONKSYON ---
window.openEmployeeModal = function() {
    document.getElementById('newEmployeeModal').style.display = 'flex';
};

window.closeEmployeeModal = function() {
    document.getElementById('newEmployeeModal').style.display = 'none';
};

window.saveNewEmployee = async function() {
    const name = document.getElementById('empName').value.trim();
    const email = document.getElementById('empEmail').value.trim();
    const department = document.getElementById('empDept').value;
    const position = document.getElementById('empPosition').value.trim();
    const salary = parseFloat(document.getElementById('empSalary').value);

    if (!name || !email || !position || isNaN(salary) || salary <= 0) {
        alert("Tanpri ranpli tout chan yo byen.");
        return;
    }

    try {
        // Kreye yon nouvo anplwaye nan Firestore
        await createEmployee(COMPANY_ID, {
            name: name,
            email: email,
            department: department,
            position: position,
            baseSalary: salary,
            status: 'Actif'
        });

        alert("✅ Anplwaye anrejistre avèk siksè!");
        closeEmployeeModal();
        await initRH(); // Refè KPI yo otomatikman

    } catch (error) {
        console.error(error);
        alert("❌ Erè pandan anrejistreman: " + error.message);
    }
};

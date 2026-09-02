/**
 * Engineer Travel Distance & Payout System
 * Admin Operations Portal Controller with Supabase Cloud & Live Fleet Radar
 */

class AdminController {
  constructor() {
    this.currentDate = new Date().toISOString().split('T')[0];
    this.selectedEngineerId = null;
    this.routeMap = null;
    this.fleetMap = null;
    this.parsedEnterpriseCases = [];
    this.fleetPollingTimer = null;
  }

  init() {
    this.checkAdminAuth();
    this.setupDatePickers();
    this.loadEngineerDropdowns();
    this.renderOverviewMetrics();
    this.renderJobsDispatcher();
    this.renderEngineersDirectory();
    this.renderDailyStatements();
    this.renderMonthlySummary();
    this.loadSettingsForm();
    this.updateSupabaseStatusUI();
  }

  // ==========================================================
  // ADMIN AUTHENTICATION
  // ==========================================================
  checkAdminAuth() {
    const modal = document.getElementById('modal-admin-login');
    if (!db.isAdminAuthenticated()) {
      if (modal) modal.classList.remove('hidden');
    } else {
      if (modal) modal.classList.add('hidden');
    }
  }

  submitAdminLogin(e) {
    if (e) e.preventDefault();
    const user = document.getElementById('admin-login-username').value.trim();
    const pass = document.getElementById('admin-login-password').value.trim();

    if (db.validateAdminLogin(user, pass)) {
      document.getElementById('modal-admin-login').classList.add('hidden');
      alert('🔓 Admin Access Granted! Welcome to TravelTrack Operations Portal.');
      this.init();
    } else {
      alert('❌ Invalid Admin ID or Password! Please check your credentials.');
    }
  }

  logoutAdmin() {
    if (confirm('Logout from Admin Operations Portal?')) {
      this.stopFleetRadarPolling();
      db.setAdminAuthenticated(false);
      this.checkAdminAuth();
    }
  }

  // ==========================================================
  // SUPABASE CLOUD SYNC CONTROLS
  // ==========================================================
  async testAndConnectSupabase() {
    const url = document.getElementById('set-supabase-url').value.trim();
    const key = document.getElementById('set-supabase-key').value.trim();
    const btn = document.getElementById('btn-connect-supabase');

    if (!url || !key) {
      alert('Please fill in both Supabase Project URL and Anon API Key.');
      return;
    }

    if (btn) {
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Testing Connection...`;
      btn.disabled = true;
    }

    const success = await db.connectSupabase(url, key, true);

    if (btn) {
      btn.innerHTML = `<i class="fa-solid fa-plug mr-1"></i> Test & Connect to Supabase`;
      btn.disabled = false;
    }

    this.updateSupabaseStatusUI();
    if (success) {
      this.renderEngineersDirectory();
      this.renderJobsDispatcher();
      this.renderOverviewMetrics();
    }
  }

  async seedSupabaseFromLocal() {
    if (confirm('Upload all local engineers, customers, jobs, and settings into your connected Supabase database?')) {
      const btn = document.getElementById('btn-seed-supabase');
      if (btn) {
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Seeding Cloud Database...`;
        btn.disabled = true;
      }

      await db.seedCloudDatabase();

      if (btn) {
        btn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up mr-1"></i> Seed Cloud Database with Initial Data`;
        btn.disabled = false;
      }
    }
  }

  updateSupabaseStatusUI() {
    const badge = document.getElementById('supabase-status-badge');
    const headerBadge = document.getElementById('header-supabase-badge');
    if (!badge) return;

    if (db.isCloudConnected) {
      badge.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5';
      badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> <span>Supabase Connected 🟢</span>`;
      if (headerBadge) {
        headerBadge.className = 'text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300 font-mono hidden md:inline';
        headerBadge.innerText = '🟢 Supabase Live';
      }
    } else {
      badge.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1.5';
      badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-slate-400"></span> <span>Local Storage Mode 💾</span>`;
      if (headerBadge) {
        headerBadge.className = 'text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full border border-slate-300 font-mono hidden md:inline';
        headerBadge.innerText = '💾 Offline Ready';
      }
    }
  }

  // ==========================================================
  // INITIAL SETUP & DATE PICKERS
  // ==========================================================
  setupDatePickers() {
    const dPicker = document.getElementById('dispatch-date-picker');
    const sPicker = document.getElementById('statement-date-picker');
    const mPicker = document.getElementById('monthly-payout-picker');

    if (dPicker) {
      dPicker.value = this.currentDate;
      dPicker.addEventListener('change', (e) => {
        this.currentDate = e.target.value;
        this.renderJobsDispatcher();
      });
    }

    if (sPicker) {
      sPicker.value = this.currentDate;
      sPicker.addEventListener('change', (e) => {
        this.renderDailyStatements(e.target.value);
      });
    }

    if (mPicker) {
      mPicker.value = this.currentDate.substring(0, 7);
      mPicker.addEventListener('change', (e) => {
        this.renderMonthlySummary(e.target.value);
      });
    }
  }

  loadEngineerDropdowns() {
    const engineers = db.getEngineers().filter(e => e.is_active !== false);
    const selDispatch = document.getElementById('dispatch-engineer-select');
    const selJobModal = document.getElementById('job-modal-engineer-select');

    if (engineers.length > 0 && !this.selectedEngineerId) {
      this.selectedEngineerId = engineers[0].id;
    }

    const optionsHtml = engineers.map(e => `
      <option value="${e.id}" ${e.id === this.selectedEngineerId ? 'selected' : ''}>
        ${e.name} (${e.vehicle_type} • ID: ${e.login_id || e.phone})
      </option>
    `).join('');

    if (selDispatch) {
      selDispatch.innerHTML = optionsHtml || `<option value="">No engineers registered</option>`;
      selDispatch.addEventListener('change', (e) => {
        this.selectedEngineerId = e.target.value;
        this.renderJobsDispatcher();
      });
    }

    if (selJobModal) {
      selJobModal.innerHTML = optionsHtml || `<option value="">No engineers registered</option>`;
    }
  }

  // ==========================================================
  // OVERVIEW KPIS
  // ==========================================================
  renderOverviewMetrics() {
    const engineers = db.getEngineers().filter(e => e.is_active !== false);
    const jobs = db.getJobs({ date: this.currentDate });
    const trips = db.getDailyTrips({ date: this.currentDate });
    const monthTrips = db.getDailyTrips({ month: this.currentDate.substring(0, 7) });

    let todayKm = 0;
    let todayPayout = 0;
    trips.forEach(t => {
      todayKm += Number(t.total_km || 0);
      todayPayout += Number(t.total_payout || 0);
    });

    let monthPayout = 0;
    monthTrips.forEach(t => {
      monthPayout += Number(t.total_payout || 0);
    });

    const elEng = document.getElementById('stat-active-engineers');
    const elJobs = document.getElementById('stat-today-jobs');
    const elKm = document.getElementById('stat-today-km');
    const elPay = document.getElementById('stat-today-payout');
    const elMonth = document.getElementById('stat-month-payout');

    if (elEng) elEng.innerText = engineers.length;
    if (elJobs) elJobs.innerText = jobs.length;
    if (elKm) elKm.innerText = `${todayKm.toFixed(1)} km`;
    if (elPay) elPay.innerText = `₹${todayPayout.toFixed(2)}`;
    if (elMonth) elMonth.innerText = `₹${monthPayout.toFixed(2)}`;
  }

  // ==========================================================
  // VISIT DISPATCHER & ROUTE CALCULATOR
  // ==========================================================
  async renderJobsDispatcher() {
    const container = document.getElementById('dispatch-jobs-list');
    if (!container) return;

    if (!this.selectedEngineerId) {
      this.loadEngineerDropdowns();
    }

    const engineer = db.getEngineerById(this.selectedEngineerId);
    if (!engineer) {
      container.innerHTML = `
        <div class="bg-white p-6 rounded-xl border border-dashed border-slate-300 text-center text-slate-500 text-xs">
          No service engineers added yet.
          <div class="mt-2">
            <button onclick="adminController.openAddEngineerModal()" class="text-blue-600 font-bold hover:underline">
              + Add First Service Engineer
            </button>
          </div>
        </div>
      `;
      return;
    }

    const office = db.getMainOffice();
    const jobs = db.getJobs({ date: this.currentDate, engineerId: this.selectedEngineerId });
    const settings = db.getSettings();
    const ratePerKm = Number(settings.default_rate_per_km || CONFIG.DEFAULT_RATE_PER_KM);

    const stops = [
      {
        name: office.name,
        type: 'office',
        latitude: office.latitude,
        longitude: office.longitude,
        address: office.address
      }
    ];

    jobs.forEach((j, i) => {
      const cust = db.getCustomerById(j.customer_id) || {};
      stops.push({
        name: cust.name || `Customer ${i + 1}`,
        type: 'customer',
        latitude: cust.latitude,
        longitude: cust.longitude,
        address: cust.address,
        phone: cust.phone,
        contact_person: cust.contact_person,
        jobId: j.id,
        jobTitle: j.title,
        jobPriority: j.priority,
        jobStatus: j.status,
        work_order: j.work_order,
        serial_no: j.serial_no,
        model_description: j.model_description
      });
    });

    stops.push({
      name: `Home (${engineer.name})`,
      type: 'home',
      latitude: engineer.home_latitude,
      longitude: engineer.home_longitude,
      address: engineer.home_address
    });

    const journeyResult = await distanceEngine.calculateFullJourney(stops, ratePerKm);

    let html = '';
    jobs.forEach((job, idx) => {
      const cust = db.getCustomerById(job.customer_id) || {};
      const leg = journeyResult.legs[idx] || {};

      html += `
        <div class="bg-white border border-slate-200 rounded-xl p-3 mb-2.5 shadow-sm hover:border-blue-300 transition" data-job-id="${job.id}">
          <div class="flex items-start justify-between">
            <div class="flex items-start gap-2.5">
              <span class="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                ${idx + 1}
              </span>
              <div>
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="font-bold text-slate-800 text-xs">${cust.name}</span>
                  ${job.work_order ? `<span class="text-[9px] bg-blue-100 text-blue-800 font-mono font-bold px-1.5 py-0.2 rounded border border-blue-200">${job.work_order}</span>` : ''}
                  ${job.call_type ? `<span class="text-[9px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.2 rounded">${job.call_type}</span>` : ''}
                </div>
                <div class="text-[11px] text-slate-500">${cust.address}</div>
                ${job.model_description ? `<div class="text-[10px] text-slate-600 font-medium mt-0.5"><i class="fa-solid fa-laptop text-blue-500 mr-1"></i>${job.model_description} ${job.serial_no ? `(S/N: ${job.serial_no})` : ''}</div>` : ''}
              </div>
            </div>
            <div class="flex items-center gap-1">
              <button onclick="adminController.moveJob('${job.id}', -1)" class="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 text-xs flex items-center justify-center" title="Move Up">
                <i class="fa-solid fa-arrow-up"></i>
              </button>
              <button onclick="adminController.moveJob('${job.id}', 1)" class="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 text-xs flex items-center justify-center" title="Move Down">
                <i class="fa-solid fa-arrow-down"></i>
              </button>
              <button onclick="adminController.deleteJob('${job.id}')" class="w-6 h-6 bg-red-50 hover:bg-red-100 rounded text-red-600 text-xs flex items-center justify-center ml-1" title="Delete">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>

          <div class="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-500">
            <span>Leg Distance: <strong>${leg.distanceKm || 0} km</strong></span>
            <span class="font-bold text-emerald-700 font-mono">+₹${(leg.amount || 0).toFixed(2)} (@ ₹2.50/KM)</span>
          </div>
        </div>
      `;
    });

    if (jobs.length === 0) {
      html = `
        <div class="bg-white p-6 rounded-xl border border-dashed border-slate-300 text-center text-slate-500 text-xs">
          No service visits scheduled for this engineer on ${this.currentDate}.
          <div class="mt-2">
            <button onclick="adminController.openAddJobModal()" class="text-blue-600 font-bold hover:underline">
              + Add Customer Stop
            </button>
            or
            <label class="text-emerald-600 font-bold hover:underline cursor-pointer ml-1">
              Import Excel File
              <input type="file" accept=".xlsx, .xls, .csv" onchange="adminController.handleExcelFileUpload(event)" class="hidden">
            </label>
          </div>
        </div>
      `;
    }

    container.innerHTML = html;

    this.renderRouteCalculationPreview(journeyResult, engineer);

    setTimeout(() => {
      mapManager.renderJourney('admin-route-map', stops, journeyResult.legs, journeyResult.allRouteCoordinates);
    }, 200);
  }

  renderRouteCalculationPreview(journey, engineer) {
    const container = document.getElementById('route-calculation-preview');
    if (!container) return;

    container.innerHTML = `
      <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div class="flex justify-between items-center mb-3">
          <span class="font-bold text-slate-800 text-xs uppercase tracking-wider">Daily Route Payout Breakdown</span>
          <span class="text-xs font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
            ₹2.50 / KM Standard
          </span>
        </div>

        <div class="space-y-2 mb-3 max-h-48 overflow-y-auto pr-1">
          ${journey.legs.map(leg => `
            <div class="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50 border border-slate-100">
              <div>
                <span class="font-semibold text-slate-700">${leg.legOrder}. ${leg.fromName.split('(')[0]} &rarr; ${leg.toName.split('(')[0]}</span>
              </div>
              <div class="text-right font-mono">
                <span class="text-slate-600 font-medium">${leg.distanceKm} km</span>
                <span class="text-emerald-600 font-bold ml-1.5">₹${leg.amount.toFixed(2)}</span>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="pt-3 border-t border-slate-200 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 -mx-4 -mb-4 p-4 rounded-b-xl">
          <div>
            <div class="text-[10px] uppercase font-bold text-slate-500">Total Route Travel</div>
            <div class="text-lg font-black text-slate-900">${journey.totalKm} KM</div>
          </div>
          <div class="text-right">
            <div class="text-[10px] uppercase font-bold text-slate-500">Approved Payout (${engineer.name})</div>
            <div class="text-xl font-black text-emerald-600 font-mono">₹${journey.totalPayout.toFixed(2)}</div>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================================
  // ENTERPRISE EXCEL IMPORT & BULK DISPATCHER
  // ==========================================================
  async handleExcelFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const parsedCases = await reportsEngine.parseJobsFile(file);
      if (!parsedCases || parsedCases.length === 0) {
        alert('⚠️ No valid cases found in the uploaded file. Please check column headers.');
        return;
      }

      this.parsedEnterpriseCases = parsedCases;
      this.openBulkCaseDispatcherModal(parsedCases);
    } catch (err) {
      alert('❌ Failed to parse Excel file: ' + err.message);
    } finally {
      event.target.value = '';
    }
  }

  openBulkCaseDispatcherModal(cases) {
    const modal = document.getElementById('modal-bulk-case-dispatcher');
    const tbody = document.getElementById('bulk-cases-table-body');
    const badge = document.getElementById('bulk-case-count-badge');
    const selAll = document.getElementById('bulk-assign-all-engineer');
    const dateInput = document.getElementById('bulk-dispatch-date');

    if (!modal || !tbody) return;

    const engineers = db.getEngineers().filter(e => e.is_active !== false);

    if (badge) badge.innerText = `${cases.length} Service Cases Found`;
    if (dateInput) dateInput.value = this.currentDate;

    if (selAll) {
      selAll.innerHTML = `
        <option value="">-- Quick Assign All to Engineer --</option>
        ${engineers.map(e => `<option value="${e.id}">${e.name} (${e.vehicle_type})</option>`).join('')}
      `;
    }

    tbody.innerHTML = cases.map((c, idx) => `
      <tr class="border-b border-slate-100 hover:bg-slate-50 text-xs" data-case-index="${idx}">
        <td class="py-2.5 px-3">
          <span class="font-mono font-bold text-blue-700 block">${c.work_order || 'WO-' + (idx + 1)}</span>
          <span class="text-[10px] text-slate-500 font-mono">Case: ${c.main_case || 'N/A'}</span>
          <span class="text-[9px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.2 rounded inline-block mt-0.5">${c.call_type}</span>
        </td>
        <td class="py-2.5 px-3">
          <div class="font-bold text-slate-800">${c.company_name}</div>
          <div class="text-[11px] text-slate-600">${c.contact_person} <span class="font-mono text-slate-500">(${c.phone})</span></div>
        </td>
        <td class="py-2.5 px-3">
          <div class="font-semibold text-slate-700">${c.model_description}</div>
          <div class="text-[10px] font-mono text-slate-500">S/N: ${c.serial_no || 'N/A'} | ${c.otc_code || 'Warranty'}</div>
        </td>
        <td class="py-2.5 px-3 max-w-xs">
          <div class="text-slate-700 truncate" title="${c.address}">${c.address}</div>
          <span class="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
            Pin: ${c.pincode}
          </span>
        </td>
        <td class="py-2.5 px-3">
          <select class="bulk-row-engineer-select border border-slate-300 rounded-lg p-1 text-xs font-semibold bg-white w-full">
            ${engineers.map(e => `
              <option value="${e.id}" ${e.id === this.selectedEngineerId ? 'selected' : ''}>
                ${e.name}
              </option>
            `).join('')}
          </select>
        </td>
      </tr>
    `).join('');

    modal.classList.remove('hidden');
  }

  applyBulkEngineerToAll() {
    const selAll = document.getElementById('bulk-assign-all-engineer');
    if (!selAll || !selAll.value) return;

    const targetEngId = selAll.value;
    document.querySelectorAll('.bulk-row-engineer-select').forEach(sel => {
      sel.value = targetEngId;
    });
  }

  autoDistributeByPincode() {
    const engineers = db.getEngineers().filter(e => e.is_active !== false);
    if (engineers.length === 0) return;

    const rows = document.querySelectorAll('#bulk-cases-table-body tr');
    rows.forEach((row, idx) => {
      const caseItem = this.parsedEnterpriseCases[idx];
      if (!caseItem) return;

      let nearestEng = engineers[0];
      let shortestDist = Infinity;

      engineers.forEach(eng => {
        const d = distanceEngine.haversineDistance(
          caseItem.latitude,
          caseItem.longitude,
          eng.home_latitude,
          eng.home_longitude
        );
        if (d < shortestDist) {
          shortestDist = d;
          nearestEng = eng;
        }
      });

      const select = row.querySelector('.bulk-row-engineer-select');
      if (select && nearestEng) {
        select.value = nearestEng.id;
      }
    });

    alert('✨ Cases automatically matched to nearest engineers based on home location & customer pincode!');
  }

  confirmAndDispatchBulkCases() {
    if (!this.parsedEnterpriseCases || this.parsedEnterpriseCases.length === 0) {
      alert('No cases to dispatch.');
      return;
    }

    const dispatchDate = document.getElementById('bulk-dispatch-date').value || this.currentDate;
    const rowSelects = document.querySelectorAll('.bulk-row-engineer-select');

    let createdCount = 0;
    this.parsedEnterpriseCases.forEach((c, idx) => {
      const assignedEngId = rowSelects[idx] ? rowSelects[idx].value : this.selectedEngineerId;

      const customer = db.saveCustomer({
        name: c.company_name || 'Client Site',
        contact_person: c.contact_person || 'Customer POC',
        phone: c.phone || '+91 98100 12345',
        address: c.address || 'New Delhi NCR',
        pincode: c.pincode || '110001',
        latitude: c.latitude || 28.5355,
        longitude: c.longitude || 77.2730,
        city: 'New Delhi'
      });

      db.saveJob({
        title: `${c.call_type}: ${c.model_description}`,
        description: `Work Order: ${c.work_order} | Main Case: ${c.main_case} | Serial: ${c.serial_no} | Warranty: ${c.otc_code}`,
        call_type: c.call_type,
        work_order: c.work_order,
        main_case: c.main_case,
        serial_no: c.serial_no,
        model_description: c.model_description,
        otc_code: c.otc_code,
        customer_id: customer.id,
        engineer_id: assignedEngId,
        scheduled_date: dispatchDate,
        sequence_order: idx + 1,
        status: 'assigned'
      });

      createdCount++;
    });

    this.closeModal('modal-bulk-case-dispatcher');
    alert(`🎉 Successfully dispatched ${createdCount} service cases for ${dispatchDate}!\n\nRoutes and payouts (@ ₹2.50/KM) calculated immediately.`);

    this.currentDate = dispatchDate;
    document.getElementById('dispatch-date-picker').value = dispatchDate;
    this.renderJobsDispatcher();
    this.renderOverviewMetrics();
  }

  // ==========================================================
  // JOB MANAGEMENT
  // ==========================================================
  openAddJobModal() {
    const modal = document.getElementById('modal-job');
    const custSelect = document.getElementById('job-customer-select');
    const dateInput = document.getElementById('job-date');

    const customers = db.getCustomers();
    if (custSelect) {
      custSelect.innerHTML = customers.map(c => `
        <option value="${c.id}">${c.name} (${c.address})</option>
      `).join('');
    }

    if (dateInput) dateInput.value = this.currentDate;
    this.loadEngineerDropdowns();

    if (modal) modal.classList.remove('hidden');
  }

  saveJobFromForm(e) {
    e.preventDefault();
    const custId = document.getElementById('job-customer-select').value;
    const engId = document.getElementById('job-modal-engineer-select').value;
    const date = document.getElementById('job-date').value;
    const title = document.getElementById('job-title').value.trim();
    const priority = document.getElementById('job-priority').value;
    const desc = document.getElementById('job-desc').value.trim();

    const existingJobs = db.getJobs({ date, engineerId: engId });

    db.saveJob({
      title,
      description: desc,
      customer_id: custId,
      engineer_id: engId,
      scheduled_date: date,
      priority,
      sequence_order: existingJobs.length + 1,
      status: 'assigned'
    });

    this.closeModal('modal-job');
    alert('✅ Customer visit added to schedule!');
    this.renderJobsDispatcher();
    this.renderOverviewMetrics();
  }

  deleteJob(jobId) {
    if (confirm('Remove this customer stop from the route schedule?')) {
      db.deleteJob(jobId);
      this.renderJobsDispatcher();
      this.renderOverviewMetrics();
    }
  }

  moveJob(jobId, direction) {
    const jobs = db.getJobs({ date: this.currentDate, engineerId: this.selectedEngineerId });
    const index = jobs.findIndex(j => j.id === jobId);
    if (index === -1) return;

    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= jobs.length) return;

    const temp = jobs[index].sequence_order;
    jobs[index].sequence_order = jobs[newIndex].sequence_order;
    jobs[newIndex].sequence_order = temp;

    db.saveJob(jobs[index]);
    db.saveJob(jobs[newIndex]);

    this.renderJobsDispatcher();
  }

  async optimizeJobOrder() {
    const jobs = db.getJobs({ date: this.currentDate, engineerId: this.selectedEngineerId });
    if (jobs.length <= 1) {
      alert('Need at least 2 customer stops to optimize route order.');
      return;
    }

    const office = db.getMainOffice();
    const engineer = db.getEngineerById(this.selectedEngineerId);

    const stops = [
      { name: office.name, type: 'office', latitude: office.latitude, longitude: office.longitude }
    ];

    jobs.forEach(j => {
      const cust = db.getCustomerById(j.customer_id) || {};
      stops.push({ name: cust.name, type: 'customer', latitude: cust.latitude, longitude: cust.longitude, jobId: j.id });
    });

    stops.push({ name: engineer.name, type: 'home', latitude: engineer.home_latitude, longitude: engineer.home_longitude });

    const optimized = distanceEngine.optimizeRouteSequence(stops);

    optimized.customerStops.forEach((stop, newOrder) => {
      const job = db.getJobById(stop.jobId);
      if (job) {
        job.sequence_order = newOrder + 1;
        db.saveJob(job);
      }
    });

    alert('✨ Route sequence automatically optimized for shortest travel distance!');
    this.renderJobsDispatcher();
  }

  // ==========================================================
  // ENGINEERS DIRECTORY & PASSWORDS
  // ==========================================================
  renderEngineersDirectory() {
    const tbody = document.getElementById('engineers-table-body');
    if (!tbody) return;

    const engineers = db.getEngineers();

    tbody.innerHTML = engineers.map(eng => `
      <tr class="border-b border-slate-100 hover:bg-slate-50 text-xs">
        <td class="py-3 px-4">
          <div class="font-bold text-slate-900">${eng.name}</div>
          <div class="text-[11px] text-slate-500">${eng.email || 'N/A'}</div>
        </td>
        <td class="py-3 px-4 font-mono text-slate-700">${eng.phone}</td>
        <td class="py-3 px-4">
          <div class="bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200 inline-block">
            <span class="text-[10px] text-slate-500 uppercase font-bold block">ID: <strong class="text-blue-900 font-mono">${eng.login_id || 'eng' + eng.phone.slice(-4)}</strong></span>
            <span class="text-[10px] text-slate-500 uppercase font-bold block">Pass: <strong class="text-emerald-700 font-mono">${eng.password || '1234'}</strong></span>
          </div>
        </td>
        <td class="py-3 px-4">
          <div class="text-slate-800">${eng.home_address}</div>
          <div class="text-[10px] text-slate-500 font-mono">GPS: ${eng.home_latitude}, ${eng.home_longitude}</div>
        </td>
        <td class="py-3 px-4">
          <span class="font-semibold text-slate-700">${eng.vehicle_type}</span>
          <div class="text-[10px] font-mono text-slate-500">${eng.vehicle_number || ''}</div>
        </td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${eng.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'}">
            ${eng.is_active !== false ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td class="py-3 px-4 text-right">
          <button onclick="adminController.openEditEngineerModal('${eng.id}')" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-bold text-xs mr-1">
            <i class="fa-solid fa-pen-to-square"></i> Edit & Pass
          </button>
          <button onclick="adminController.deleteEngineer('${eng.id}')" class="px-2 py-1 bg-red-50 hover:bg-red-100 rounded text-red-600 font-bold text-xs">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  }

  openAddEngineerModal() {
    document.getElementById('modal-engineer-title').innerText = 'Add New Service Engineer';
    document.getElementById('eng-id').value = '';
    document.getElementById('eng-name').value = '';
    document.getElementById('eng-phone').value = '';
    document.getElementById('eng-email').value = '';
    document.getElementById('eng-login-id').value = '';
    document.getElementById('eng-password').value = '1234';
    document.getElementById('eng-vehicle-type').value = 'Motorcycle/Bike';
    document.getElementById('eng-vehicle-number').value = '';
    document.getElementById('eng-address').value = '';
    document.getElementById('eng-lat').value = 28.6083;
    document.getElementById('eng-lng').value = 77.2952;
    document.getElementById('eng-active').checked = true;

    document.getElementById('modal-engineer').classList.remove('hidden');

    setTimeout(() => this.initLocationPickerMap(28.6083, 77.2952), 200);
  }

  openEditEngineerModal(id) {
    const eng = db.getEngineerById(id);
    if (!eng) return;

    document.getElementById('modal-engineer-title').innerText = `Edit Engineer & Password (${eng.name})`;
    document.getElementById('eng-id').value = eng.id;
    document.getElementById('eng-name').value = eng.name;
    document.getElementById('eng-phone').value = eng.phone;
    document.getElementById('eng-email').value = eng.email || '';
    document.getElementById('eng-login-id').value = eng.login_id || ('eng' + eng.phone.slice(-4));
    document.getElementById('eng-password').value = eng.password || '1234';
    document.getElementById('eng-vehicle-type').value = eng.vehicle_type || 'Motorcycle/Bike';
    document.getElementById('eng-vehicle-number').value = eng.vehicle_number || '';
    document.getElementById('eng-address').value = eng.home_address || '';
    document.getElementById('eng-lat').value = eng.home_latitude || 28.6083;
    document.getElementById('eng-lng').value = eng.home_longitude || 77.2952;
    document.getElementById('eng-active').checked = eng.is_active !== false;

    document.getElementById('modal-engineer').classList.remove('hidden');

    setTimeout(() => this.initLocationPickerMap(eng.home_latitude, eng.home_longitude), 200);
  }

  initLocationPickerMap(lat = 28.6083, lng = 77.2952) {
    const container = document.getElementById('eng-home-map-picker');
    if (!container) return;

    if (!this.pickerMap) {
      this.pickerMap = L.map('eng-home-map-picker').setView([lat, lng], 14);
      L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      }).addTo(this.pickerMap);

      this.pickerMarker = L.marker([lat, lng], { draggable: true }).addTo(this.pickerMap);

      this.pickerMarker.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        document.getElementById('eng-lat').value = pos.lat.toFixed(5);
        document.getElementById('eng-lng').value = pos.lng.toFixed(5);
      });

      this.pickerMap.on('click', (e) => {
        this.pickerMarker.setLatLng(e.latlng);
        document.getElementById('eng-lat').value = e.latlng.lat.toFixed(5);
        document.getElementById('eng-lng').value = e.latlng.lng.toFixed(5);
      });
    } else {
      this.pickerMap.invalidateSize();
      this.pickerMap.setView([lat, lng], 14);
      this.pickerMarker.setLatLng([lat, lng]);
    }
  }

  async autoDetectCurrentHomeGPS() {
    const btn = document.getElementById('btn-admin-detect-home-gps');
    if (btn) btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Detecting GPS...`;

    try {
      const pos = await gpsTracker.getCurrentLocation();
      const addr = await gpsTracker.reverseGeocode(pos.latitude, pos.longitude);

      document.getElementById('eng-lat').value = pos.latitude.toFixed(5);
      document.getElementById('eng-lng').value = pos.longitude.toFixed(5);
      if (addr && !document.getElementById('eng-address').value) {
        document.getElementById('eng-address').value = addr;
      }
      this.initLocationPickerMap(pos.latitude, pos.longitude);
      alert(`📍 GPS Auto-Detected!\n\nLatitude: ${pos.latitude}\nLongitude: ${pos.longitude}\nAddress: ${addr}`);
    } catch (e) {
      alert('Could not auto-detect GPS: ' + e.message);
    } finally {
      if (btn) btn.innerHTML = `<i class="fa-solid fa-location-crosshairs"></i> Auto-Detect Current GPS`;
    }
  }

  saveEngineerFromForm(e) {
    e.preventDefault();
    const id = document.getElementById('eng-id').value;
    const name = document.getElementById('eng-name').value.trim();
    const phone = document.getElementById('eng-phone').value.trim();
    const email = document.getElementById('eng-email').value.trim();
    const login_id = document.getElementById('eng-login-id').value.trim();
    const password = document.getElementById('eng-password').value.trim();
    const vehicle_type = document.getElementById('eng-vehicle-type').value;
    const vehicle_number = document.getElementById('eng-vehicle-number').value.trim();
    const home_address = document.getElementById('eng-address').value.trim();
    const home_latitude = parseFloat(document.getElementById('eng-lat').value);
    const home_longitude = parseFloat(document.getElementById('eng-lng').value);
    const is_active = document.getElementById('eng-active').checked;

    const engineer = {
      id: id || undefined,
      name,
      phone,
      email,
      login_id: login_id || ('eng' + phone.replace(/\D/g, '').slice(-4)),
      password: password || '1234',
      vehicle_type,
      vehicle_number,
      home_address,
      home_latitude,
      home_longitude,
      is_active
    };

    db.saveEngineer(engineer);
    this.closeModal('modal-engineer');
    alert('✅ Engineer profile & login password saved successfully!');
    this.renderEngineersDirectory();
    this.loadEngineerDropdowns();
  }

  deleteEngineer(id) {
    if (confirm('Delete this engineer from the system?')) {
      db.deleteEngineer(id);
      this.renderEngineersDirectory();
      this.loadEngineerDropdowns();
    }
  }

  // ==========================================================
  // REAL-TIME FLEET GPS RADAR (LIVE AUTO-SYNC)
  // ==========================================================
  startFleetRadarPolling() {
    this.stopFleetRadarPolling();
    this.renderFleetLiveTracker();
    this.fleetPollingTimer = setInterval(() => {
      this.renderFleetLiveTracker();
    }, 3000);
  }

  stopFleetRadarPolling() {
    if (this.fleetPollingTimer) {
      clearInterval(this.fleetPollingTimer);
      this.fleetPollingTimer = null;
    }
  }

  async renderFleetLiveTracker() {
    const container = document.getElementById('fleet-engineers-status-list');
    if (!container) return;

    const engineers = db.getEngineers().filter(e => e.is_active !== false);
    const livePings = await gpsTracker.getAllEngineersLiveLocations();

    container.innerHTML = engineers.map(eng => {
      const ping = livePings[eng.id] || {
        latitude: eng.home_latitude,
        longitude: eng.home_longitude,
        speedKmH: 0,
        accuracy: 15,
        isSimulated: false,
        timestamp: new Date().toISOString()
      };

      const isLive = gpsTracker.isEngineerOnline(eng.id);

      return `
        <div class="bg-white p-3 rounded-xl border ${isLive ? 'border-green-300 bg-green-50/20 ring-1 ring-green-400/30' : 'border-slate-200'} shadow-sm flex items-center justify-between transition">
          <div class="flex items-center gap-2.5">
            <span class="w-3 h-3 rounded-full ${isLive ? 'bg-green-500 animate-ping' : 'bg-slate-300'}"></span>
            <div>
              <div class="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                ${eng.name}
                ${isLive ? `<span class="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded animate-pulse">ON ROAD</span>` : ''}
              </div>
              <div class="text-[11px] text-slate-500">${eng.vehicle_type} (${eng.phone})</div>
            </div>
          </div>
          <div class="text-right">
            <span class="text-[10px] font-mono font-bold ${isLive ? 'text-green-700 bg-green-100 px-2 py-0.5 rounded border border-green-300' : 'text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded'}">
              ${isLive ? `🏍️ ${ping.speedKmH} km/h` : 'Standby'}
            </span>
          </div>
        </div>
      `;
    }).join('');

    if (engineers.length === 0) {
      container.innerHTML = `<div class="p-6 text-center text-slate-400 text-xs">No active engineers in directory.</div>`;
    }

    mapManager.renderFleetRadar('fleet-live-map', engineers, livePings);
  }

  // ==========================================================
  // DAILY STATEMENTS & APPROVALS
  // ==========================================================
  renderDailyStatements(date = this.currentDate) {
    const tbody = document.getElementById('statements-table-body');
    if (!tbody) return;

    const engineers = db.getEngineers();
    const settings = db.getSettings();
    const rate = Number(settings.default_rate_per_km || CONFIG.DEFAULT_RATE_PER_KM);

    tbody.innerHTML = engineers.map(eng => {
      const trip = db.getTripByEngineerAndDate(eng.id, date);
      const jobs = db.getJobs({ date, engineerId: eng.id });
      const totalKm = trip ? trip.total_km : 0;
      const totalPayout = trip ? trip.total_payout : 0;
      const status = trip ? trip.status : (jobs.length > 0 ? 'in_progress' : 'no_trip');

      return `
        <tr class="border-b border-slate-100 hover:bg-slate-50 text-xs">
          <td class="py-3 px-4 font-bold text-slate-900">${eng.name}</td>
          <td class="py-3 px-4 text-slate-600">${date}</td>
          <td class="py-3 px-4 font-bold">${totalKm} km</td>
          <td class="py-3 px-4 font-mono text-slate-600">₹${rate.toFixed(2)}/km</td>
          <td class="py-3 px-4 font-bold font-mono text-emerald-600 text-sm">₹${totalPayout.toFixed(2)}</td>
          <td class="py-3 px-4">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${status === 'completed' || status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}">
              ${status}
            </span>
          </td>
          <td class="py-3 px-4 text-right">
            ${trip && trip.status !== 'approved' ? `
              <button onclick="adminController.approveTrip('${trip.id}')" class="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded font-bold text-xs mr-1 shadow-sm">
                Approve
              </button>
            ` : ''}
            <button onclick="adminController.printTripStatement('${trip ? trip.id : 'demo'}')" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold text-xs border border-slate-200">
              <i class="fa-solid fa-file-pdf mr-1"></i> Bill
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  approveTrip(tripId) {
    db.updateTripStatus(tripId, 'approved');
    alert('✅ Daily travel reimbursement statement approved!');
    this.renderDailyStatements();
    this.renderOverviewMetrics();
  }

  printTripStatement(tripId) {
    const trip = db.getDailyTrips().find(t => t.id === tripId) || {
      id: tripId,
      engineer_id: this.selectedEngineerId,
      trip_date: this.currentDate,
      total_km: 0,
      rate_per_km: 2.50,
      total_payout: 0
    };
    const eng = db.getEngineerById(trip.engineer_id);
    reportsEngine.generatePrintableStatement(trip, eng, trip.legs || []);
  }

  // ==========================================================
  // MONTHLY PAYOUT SUMMARY
  // ==========================================================
  renderMonthlySummary(month = this.currentDate.substring(0, 7)) {
    const tbody = document.getElementById('monthly-payout-table-body');
    if (!tbody) return;

    const engineers = db.getEngineers();
    const settings = db.getSettings();
    const rate = Number(settings.default_rate_per_km || CONFIG.DEFAULT_RATE_PER_KM);

    tbody.innerHTML = engineers.map(eng => {
      const trips = db.getDailyTrips({ engineerId: eng.id, month });
      let totalKm = 0;
      let totalPayout = 0;

      trips.forEach(t => {
        totalKm += Number(t.total_km || 0);
        totalPayout += Number(t.total_payout || 0);
      });

      return `
        <tr class="border-b border-slate-100 hover:bg-slate-50 text-xs">
          <td class="py-3 px-4 font-bold text-slate-900">${eng.name}</td>
          <td class="py-3 px-4 text-slate-600 font-mono">${eng.phone}</td>
          <td class="py-3 px-4 text-center font-bold">${trips.length}</td>
          <td class="py-3 px-4 font-bold">${totalKm.toFixed(1)} km</td>
          <td class="py-3 px-4 font-mono text-slate-600">₹${rate.toFixed(2)}/km</td>
          <td class="py-3 px-4 font-bold font-mono text-emerald-600 text-sm">₹${totalPayout.toFixed(2)}</td>
          <td class="py-3 px-4">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">
              Verified
            </span>
          </td>
        </tr>
      `;
    }).join('');
  }

  exportMonthlyExcel() {
    const month = document.getElementById('monthly-payout-picker').value || this.currentDate.substring(0, 7);
    const engineers = db.getEngineers();
    const settings = db.getSettings();
    const rate = Number(settings.default_rate_per_km || CONFIG.DEFAULT_RATE_PER_KM);

    const data = engineers.map(eng => {
      const trips = db.getDailyTrips({ engineerId: eng.id, month });
      let totalKm = 0;
      let totalPayout = 0;
      trips.forEach(t => {
        totalKm += Number(t.total_km || 0);
        totalPayout += Number(t.total_payout || 0);
      });

      return {
        'Engineer ID': eng.login_id || eng.id,
        'Engineer Name': eng.name,
        'Mobile Phone': eng.phone,
        'Vehicle': eng.vehicle_type,
        'Month': month,
        'Total Working Trips': trips.length,
        'Total Kilometers': totalKm,
        'Rate (₹/KM)': rate,
        'Gross Payout (₹)': totalPayout,
        'Status': 'Ready for Payroll'
      };
    });

    reportsEngine.exportToExcel(data, `Monthly_Engineer_Payout_${month}`);
  }

  // ==========================================================
  // SYSTEM SETTINGS & CREDENTIALS
  // ==========================================================
  loadSettingsForm() {
    const office = db.getMainOffice();
    const settings = db.getSettings();

    const elOffName = document.getElementById('set-office-name');
    const elOffAddr = document.getElementById('set-office-address');
    const elOffLat = document.getElementById('set-office-lat');
    const elOffLng = document.getElementById('set-office-lng');
    const elRate = document.getElementById('set-default-rate');
    const elCompName = document.getElementById('set-company-name');
    const elAdminUser = document.getElementById('set-admin-username');
    const elAdminPass = document.getElementById('set-admin-password');
    const elSupUrl = document.getElementById('set-supabase-url');
    const elSupKey = document.getElementById('set-supabase-key');

    if (elOffName) elOffName.value = office.name;
    if (elOffAddr) elOffAddr.value = office.address;
    if (elOffLat) elOffLat.value = office.latitude;
    if (elOffLng) elOffLng.value = office.longitude;
    if (elRate) elRate.value = settings.default_rate_per_km || CONFIG.DEFAULT_RATE_PER_KM;
    if (elCompName) elCompName.value = settings.company_name || 'Field Service Engineering Operations';
    if (elAdminUser) elAdminUser.value = settings.admin_username || 'admin';
    if (elAdminPass) elAdminPass.value = settings.admin_password || 'admin123';
    if (elSupUrl) elSupUrl.value = settings.supabase_url || CONFIG.SUPABASE.URL;
    if (elSupKey) elSupKey.value = settings.supabase_anon_key || CONFIG.SUPABASE.ANON_KEY;

    this.updateSupabaseStatusUI();
  }

  saveSettingsFromForm(e) {
    e.preventDefault();

    const office = {
      id: 'off-001',
      name: document.getElementById('set-office-name').value.trim(),
      address: document.getElementById('set-office-address').value.trim(),
      latitude: parseFloat(document.getElementById('set-office-lat').value),
      longitude: parseFloat(document.getElementById('set-office-lng').value),
      is_primary: true
    };

    const adminUser = document.getElementById('set-admin-username') ? document.getElementById('set-admin-username').value.trim() : 'admin';
    const adminPass = document.getElementById('set-admin-password') ? document.getElementById('set-admin-password').value.trim() : 'admin123';
    const supabaseUrl = document.getElementById('set-supabase-url') ? document.getElementById('set-supabase-url').value.trim() : '';
    const supabaseKey = document.getElementById('set-supabase-key') ? document.getElementById('set-supabase-key').value.trim() : '';

    const settings = {
      default_rate_per_km: parseFloat(document.getElementById('set-default-rate').value) || 2.50,
      company_name: document.getElementById('set-company-name').value.trim(),
      admin_username: adminUser || 'admin',
      admin_password: adminPass || 'admin123',
      supabase_url: supabaseUrl,
      supabase_anon_key: supabaseKey
    };

    db.saveOffice(office);
    db.saveSettings(settings);

    if (supabaseUrl && supabaseKey) {
      db.connectSupabase(supabaseUrl, supabaseKey, false);
    }

    alert('✅ System configuration & Admin credentials saved successfully!');
    this.renderJobsDispatcher();
    this.renderOverviewMetrics();
    this.updateSupabaseStatusUI();
  }

  async autoDetectOfficeGPS() {
    const btn = document.getElementById('btn-admin-detect-office-gps');
    if (btn) btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Detecting...`;

    try {
      const pos = await gpsTracker.getCurrentLocation();
      const addr = await gpsTracker.reverseGeocode(pos.latitude, pos.longitude);

      document.getElementById('set-office-lat').value = pos.latitude.toFixed(5);
      document.getElementById('set-office-lng').value = pos.longitude.toFixed(5);
      if (addr) document.getElementById('set-office-address').value = addr;

      alert(`📍 Main Office GPS Auto-Detected!\n\nAddress: ${addr}\nLat: ${pos.latitude}\nLng: ${pos.longitude}`);
    } catch (err) {
      alert('Could not detect GPS: ' + err.message);
    } finally {
      if (btn) btn.innerHTML = `<i class="fa-solid fa-location-crosshairs"></i> Auto-Detect Office GPS`;
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
  }

  async resetDataToDemo() {
    if (confirm('Reset database to clean defaults?')) {
      await db.resetToDemo();
      location.reload();
    }
  }
}

window.adminController = new AdminController();

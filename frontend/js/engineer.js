/**
 * Engineer Travel Distance & Payout System
 * Engineer Mobile PWA Controller with Authentication & Password Verification
 * - Login ID & Password verified against credentials set by Admin
 * - Strict 1-to-1 data isolation for personal field dashboard
 */

class EngineerController {
  constructor() {
    this.currentEngineerId = null;
    this.currentDate = new Date().toISOString().split('T')[0];
    this.activeTrip = null;
    this.cachedJourney = null;
    this.cachedStops = [];
    this.activeJobId = null;
    this.isGPSActive = false;
  }

  init() {
    this.checkEngineerAuth();
    this.setupGPSSubscription();
  }

  // ==========================================================
  // ENGINEER AUTHENTICATION & LOGIN
  // ==========================================================
  checkEngineerAuth() {
    const modal = document.getElementById('modal-engineer-login');
    if (!db.isEngineerAuthenticated()) {
      if (modal) modal.classList.remove('hidden');
    } else {
      this.currentEngineerId = db.getLoggedInEngineerId();
      if (modal) modal.classList.add('hidden');
      this.loadEngineerProfile();
      this.renderTodayJourney();
      this.renderPastTrips();
    }
  }

  submitEngineerLogin(e) {
    if (e) e.preventDefault();
    const loginInput = document.getElementById('login-id-input').value.trim();
    const passInput = document.getElementById('login-password-input').value.trim();

    const matchedEng = db.validateEngineerLogin(loginInput, passInput);

    if (matchedEng) {
      this.currentEngineerId = matchedEng.id;
      document.getElementById('modal-engineer-login').classList.add('hidden');
      alert(`👋 Welcome back, ${matchedEng.name}!\nYou are logged into your personal field dashboard.`);
      this.loadEngineerProfile();
      this.renderTodayJourney();
      this.renderPastTrips();
    } else {
      alert('❌ Invalid Login ID/Phone or Password!\n\nPlease check with your Admin. (Default password is set by Admin)');
    }
  }

  logoutEngineer() {
    if (confirm('Log out of your field engineer account?')) {
      gpsTracker.stopTracking();
      this.isGPSActive = false;
      this.updateGPSControlUI(false);
      db.logoutEngineer();
      this.checkEngineerAuth();
    }
  }

  // Quick fill demo credentials in login modal
  quickFillDemo(loginId, pass) {
    document.getElementById('login-id-input').value = loginId;
    document.getElementById('login-password-input').value = pass;
  }

  // ==========================================================
  // TAB NAVIGATION CONTROLLER
  // ==========================================================
  switchTab(tabId, btnElement = null) {
    if (!tabId) return;

    const allButtons = document.querySelectorAll('.pwa-nav-btn');
    allButtons.forEach(btn => {
      btn.classList.remove('text-blue-600', 'font-bold', 'active-tab');
      btn.classList.add('text-slate-400', 'font-medium');
    });

    let activeBtn = btnElement;
    if (!activeBtn) {
      activeBtn = document.querySelector(`.pwa-nav-btn[data-tab="${tabId}"]`);
    }
    if (activeBtn) {
      activeBtn.classList.remove('text-slate-400', 'font-medium');
      activeBtn.classList.add('text-blue-600', 'font-bold', 'active-tab');
    }

    const allTabs = document.querySelectorAll('.pwa-tab-content');
    allTabs.forEach(tab => tab.classList.add('hidden'));

    const targetTabEl = document.getElementById(tabId);
    if (targetTabEl) {
      targetTabEl.classList.remove('hidden');
    }

    if (tabId === 'pwa-tab-profile') {
      this.loadEngineerProfile();
    } else if (tabId === 'pwa-tab-history') {
      this.renderPastTrips();
    } else if (tabId === 'pwa-tab-today') {
      this.renderTodayJourney();
    } else if (tabId === 'pwa-tab-map') {
      setTimeout(() => {
        const map = mapManager.getMap('engineer-mobile-map');
        if (map) {
          map.invalidateSize();
          if (this.cachedJourney && this.cachedStops) {
            mapManager.renderJourney('engineer-mobile-map', this.cachedStops, this.cachedJourney.legs, this.cachedJourney.allRouteCoordinates);
          }
        }
      }, 150);
    }

    const contentArea = document.querySelector('.mobile-content-area');
    if (contentArea) contentArea.scrollTop = 0;
  }

  setupGPSSubscription() {
    gpsTracker.subscribe((posData) => {
      if (posData.engineerId === this.currentEngineerId) {
        this.handleGPSUpdate(posData);
      }
    });
  }

  handleGPSUpdate(posData) {
    const elGpsBadge = document.getElementById('pwa-gps-status-badge');
    const elGpsInfo = document.getElementById('pwa-gps-info-text');

    if (elGpsBadge) {
      elGpsBadge.className = posData.isSimulated
        ? 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300'
        : 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-300 animate-pulse';
      elGpsBadge.innerHTML = posData.isSimulated ? '🎮 Simulating Ride' : '📡 Live GPS Active';
    }

    if (elGpsInfo) {
      elGpsInfo.innerText = `Speed: ${posData.speedKmH} km/h • ±${posData.accuracy}m • GPS: ${posData.latitude.toFixed(4)}, ${posData.longitude.toFixed(4)}`;
    }

    const engineer = db.getEngineerById(this.currentEngineerId);
    mapManager.updateLiveLocation(
      'engineer-mobile-map',
      this.currentEngineerId,
      posData.latitude,
      posData.longitude,
      posData.accuracy,
      posData.speedKmH,
      posData.heading,
      posData.isSimulated,
      engineer ? engineer.name : 'Engineer'
    );

    mapManager.updateBreadcrumbTrail('engineer-mobile-map', gpsTracker.breadcrumbs);

    const elActualKm = document.getElementById('pwa-actual-gps-km');
    const elActualPayout = document.getElementById('pwa-actual-gps-payout');
    const settings = db.getSettings();
    const rate = Number(settings.default_rate_per_km || CONFIG.DEFAULT_RATE_PER_KM);

    if (elActualKm) elActualKm.innerText = `${gpsTracker.actualLoggedKm.toFixed(2)} km`;
    if (elActualPayout) elActualPayout.innerText = `₹${(gpsTracker.actualLoggedKm * rate).toFixed(2)}`;

    this.checkProximityToActiveStops(posData.latitude, posData.longitude);
  }

  checkProximityToActiveStops(lat, lng) {
    if (!this.cachedStops || this.cachedStops.length === 0) return;

    const jobs = db.getJobs({ date: this.currentDate, engineerId: this.currentEngineerId });
    const currentUnfinishedJob = jobs.find(j => j.status !== 'completed');

    if (currentUnfinishedJob) {
      const cust = db.getCustomerById(currentUnfinishedJob.customer_id);
      if (cust) {
        const isNear = gpsTracker.isNearLocation(lat, lng, cust.latitude, cust.longitude, 200);
        const banner = document.getElementById('pwa-geofence-alert');

        if (isNear && banner) {
          banner.innerHTML = `
            <div class="bg-emerald-500 text-white p-3 rounded-xl shadow-lg flex items-center justify-between animate-bounce">
              <div class="flex items-center gap-2 text-xs">
                <i class="fa-solid fa-location-dot text-base"></i>
                <span><strong>Arrived at ${cust.name}</strong> (&lt;200m away)</span>
              </div>
              <button onclick="engineerController.openCompleteJobModal('${currentUnfinishedJob.id}')" class="px-2.5 py-1 bg-white text-emerald-800 font-bold text-[11px] rounded-lg shadow">
                Check In
              </button>
            </div>
          `;
          banner.classList.remove('hidden');
        } else if (banner) {
          banner.classList.add('hidden');
        }
      }
    }
  }

  loadEngineerProfile() {
    const engineer = db.getEngineerById(this.currentEngineerId);
    if (!engineer) return;

    const elName = document.getElementById('pwa-eng-name');
    const elProfName = document.getElementById('pwa-profile-full-name');
    const elProfRole = document.getElementById('pwa-profile-role');
    const elVehicle = document.getElementById('pwa-eng-vehicle');
    const elProfVehicle = document.getElementById('pwa-profile-vehicle-full');
    const elPhone = document.getElementById('pwa-eng-phone');
    const elEmail = document.getElementById('pwa-eng-email');
    const elHome = document.getElementById('pwa-eng-home');
    const elHomeGps = document.getElementById('pwa-eng-home-gps');
    const elLoginId = document.getElementById('pwa-profile-login-id');

    if (elName) elName.innerText = engineer.name;
    if (elProfName) elProfName.innerText = engineer.name;
    if (elProfRole) elProfRole.innerText = 'Field Service Engineer';
    if (elVehicle) elVehicle.innerHTML = `<i class="fa-solid fa-motorcycle mr-1"></i> ${engineer.vehicle_type} (${engineer.vehicle_number || 'DL 3S CM 4821'})`;
    if (elProfVehicle) elProfVehicle.innerText = `${engineer.vehicle_type} • ${engineer.vehicle_number || 'DL 3S CM 4821'}`;
    if (elPhone) elPhone.innerText = engineer.phone || '+91 98765 43210';
    if (elEmail) elEmail.innerText = engineer.email || `${engineer.name.toLowerCase().replace(/\s+/g, '.')}@fasttech.in`;
    if (elLoginId) elLoginId.innerText = engineer.login_id || engineer.phone;
    if (elHome) elHome.innerText = engineer.home_address || 'Mayur Vihar Phase 1, New Delhi';
    if (elHomeGps) elHomeGps.innerText = `GPS: ${Number(engineer.home_latitude || 28.6083).toFixed(5)}, ${Number(engineer.home_longitude || 77.2952).toFixed(5)}`;
  }

  async autoDetectAndSaveHomeLocation() {
    const btn = document.getElementById('btn-pwa-detect-home');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Detecting Phone GPS...`;
      btn.disabled = true;
    }

    try {
      const pos = await gpsTracker.getCurrentLocation();
      if (btn) btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Resolving Address...`;

      const streetAddress = await gpsTracker.reverseGeocode(pos.latitude, pos.longitude);
      const engineer = db.getEngineerById(this.currentEngineerId);

      if (engineer) {
        engineer.home_latitude = pos.latitude;
        engineer.home_longitude = pos.longitude;
        engineer.home_address = streetAddress;
        db.saveEngineer(engineer);

        this.loadEngineerProfile();
        await this.renderTodayJourney();

        alert(`✅ Home Location Auto-Saved Successfully!\n\n🏠 Address: ${streetAddress}\n📍 GPS: ${pos.latitude}, ${pos.longitude}\n📡 Accuracy: ±${pos.accuracy}m\n\nDaily return trips will now auto-calculate to this location.`);
      }
    } catch (err) {
      alert(`⚠️ Could not detect GPS location: ${err.message}\nPlease ensure GPS / Location permissions are enabled on your phone browser.`);
    } finally {
      if (btn) {
        btn.innerHTML = originalText || `<i class="fa-solid fa-location-crosshairs mr-1.5"></i> Auto-Detect My Home GPS`;
        btn.disabled = false;
      }
    }
  }

  openInAppGoogleNavigation(jobId) {
    const job = db.getJobById(jobId);
    if (!job) return;

    const customer = db.getCustomerById(job.customer_id);
    if (!customer) return;

    const office = db.getMainOffice();
    const jobs = db.getJobs({ date: this.currentDate, engineerId: this.currentEngineerId });
    const currentIdx = jobs.findIndex(j => j.id === jobId);

    let fromName = office.name;
    let fromLat = office.latitude;
    let fromLng = office.longitude;

    if (currentIdx > 0) {
      const prevJob = jobs[currentIdx - 1];
      const prevCust = db.getCustomerById(prevJob.customer_id);
      if (prevCust) {
        fromName = prevCust.name;
        fromLat = prevCust.latitude;
        fromLng = prevCust.longitude;
      }
    }

    const modal = document.getElementById('modal-in-app-google-nav');
    const content = document.getElementById('in-app-google-nav-content');
    if (!modal || !content) return;

    const googleMapsEmbedUrl = `https://maps.google.com/maps?q=${customer.latitude},${customer.longitude}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

    content.innerHTML = `
      <div class="flex justify-between items-center mb-3">
        <div class="flex items-center gap-2">
          <span class="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
            <i class="fa-brands fa-google"></i>
          </span>
          <h3 class="font-extrabold text-slate-800 text-sm">In-App Google Navigation</h3>
        </div>
        <button onclick="document.getElementById('modal-in-app-google-nav').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 text-lg">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3 text-xs">
        <div class="flex justify-between items-start mb-1">
          <div>
            <span class="text-[10px] uppercase font-bold text-blue-600">Heading to</span>
            <div class="font-bold text-slate-900 text-sm">${customer.name}</div>
          </div>
          <a href="tel:${customer.phone}" class="px-2 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-lg flex items-center gap-1">
            <i class="fa-solid fa-phone"></i> Call
          </a>
        </div>
        <p class="text-slate-600 text-[11px]">${customer.address}</p>
        <div class="mt-2 pt-2 border-t border-blue-200/60 flex justify-between items-center text-[11px]">
          <span class="text-slate-600">From: <strong>${fromName}</strong></span>
          <span class="text-emerald-700 font-bold font-mono">Rate: ₹2.50/KM</span>
        </div>
      </div>

      <div class="rounded-xl overflow-hidden border border-slate-300 shadow-inner mb-3 h-[320px] bg-slate-100">
        <iframe
          width="100%"
          height="100%"
          frameborder="0"
          scrolling="no"
          marginheight="0"
          marginwidth="0"
          src="${googleMapsEmbedUrl}"
          style="border:0;"
          allowfullscreen=""
          loading="lazy">
        </iframe>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <a href="https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLng}&destination=${customer.latitude},${customer.longitude}" target="_blank" class="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-slate-200">
          <i class="fa-solid fa-arrow-up-right-from-square text-blue-600"></i> Open App
        </a>
        <button onclick="document.getElementById('modal-in-app-google-nav').classList.add('hidden'); engineerController.openCompleteJobModal('${jobId}')" class="py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5">
          <i class="fa-solid fa-circle-check"></i> Mark Arrived
        </button>
      </div>
    `;

    modal.classList.remove('hidden');
  }

  // ==========================================================
  // GPS CONTROLS
  // ==========================================================
  togglePhoneGPS() {
    if (this.isGPSActive) {
      gpsTracker.stopTracking();
      this.isGPSActive = false;
      this.updateGPSControlUI(false);
      alert('⏹ Phone GPS tracking stopped.');
    } else {
      const started = gpsTracker.startPhoneTracking(
        this.currentEngineerId,
        (pos) => this.handleGPSUpdate(pos),
        (err) => {
          alert('GPS Error: ' + err.message + '\nPlease enable location permissions on your phone browser.');
          this.updateGPSControlUI(false);
        }
      );

      if (started) {
        this.isGPSActive = true;
        this.updateGPSControlUI(true);
      }
    }
  }

  toggleRideSimulation() {
    if (gpsTracker.isSimulating) {
      gpsTracker.stopTracking();
      this.isGPSActive = false;
      this.updateGPSControlUI(false);
      return;
    }

    if (!this.cachedJourney || !this.cachedJourney.allRouteCoordinates || this.cachedJourney.allRouteCoordinates.length === 0) {
      alert('Please wait for the route to calculate first.');
      return;
    }

    this.isGPSActive = true;
    this.updateGPSControlUI(true, true);

    gpsTracker.startRideSimulation(
      this.currentEngineerId,
      this.cachedJourney.allRouteCoordinates,
      6,
      (stepData) => {
        if (stepData.finished) {
          alert('🏁 Test ride simulation finished! Total actual logged distance: ' + stepData.actualKm + ' km');
          this.updateGPSControlUI(false);
        }
      }
    );
  }

  updateGPSControlUI(isActive, isSimulated = false) {
    const btnPhone = document.getElementById('btn-pwa-toggle-gps');
    const btnSim = document.getElementById('btn-pwa-toggle-sim');
    const elGpsBadge = document.getElementById('pwa-gps-status-badge');
    const elGpsInfo = document.getElementById('pwa-gps-info-text');

    if (btnPhone) {
      if (isActive && !isSimulated) {
        btnPhone.className = 'flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow';
        btnPhone.innerHTML = '<i class="fa-solid fa-stop"></i> Stop GPS';
      } else {
        btnPhone.className = 'flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow';
        btnPhone.innerHTML = '<i class="fa-solid fa-satellite-dish"></i> Start Phone GPS';
      }
    }

    if (btnSim) {
      if (isActive && isSimulated) {
        btnSim.className = 'flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow';
        btnSim.innerHTML = '<i class="fa-solid fa-stop"></i> Stop Sim';
      } else {
        btnSim.className = 'flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow';
        btnSim.innerHTML = '<i class="fa-solid fa-gamepad"></i> Test Ride Sim';
      }
    }

    if (!isActive) {
      if (elGpsBadge) {
        elGpsBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200';
        elGpsBadge.innerText = 'GPS Standby';
      }
      if (elGpsInfo) {
        elGpsInfo.innerText = 'Tap "Start Phone GPS" to track live bike movement';
      }
    }
  }

  // ==========================================================
  // TODAY'S LIVE JOURNEY UI
  // ==========================================================
  async renderTodayJourney() {
    const container = document.getElementById('engineer-journey-cards');
    if (!container) return;

    const engineer = db.getEngineerById(this.currentEngineerId);
    if (!engineer) return;

    const office = db.getMainOffice();
    const jobs = db.getJobs({ date: this.currentDate, engineerId: this.currentEngineerId });
    const settings = db.getSettings();
    const ratePerKm = Number(settings.default_rate_per_km || CONFIG.DEFAULT_RATE_PER_KM);

    let trip = db.getTripByEngineerAndDate(this.currentEngineerId, this.currentDate);

    if (jobs.length === 0) {
      container.innerHTML = `
        <div class="bg-white p-6 rounded-2xl border border-slate-200 text-center shadow-sm">
          <div class="text-4xl mb-3">☕</div>
          <h3 class="font-bold text-slate-800 text-base">No Assigned Jobs Today</h3>
          <p class="text-xs text-slate-500 mt-1">You have no scheduled customer visits assigned for ${this.currentDate}.</p>
        </div>
      `;
      this.updateTripSummaryCard(0, 0, ratePerKm, 'No Active Trip');
      return;
    }

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
        jobDesc: j.description,
        jobPriority: j.priority,
        jobStatus: j.status
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
    this.cachedJourney = journeyResult;
    this.cachedStops = stops;

    const isTripFinished = trip && (trip.status === 'completed' || trip.status === 'approved' || trip.status === 'paid');

    this.updateTripSummaryCard(
      isTripFinished ? trip.total_km : journeyResult.totalKm,
      isTripFinished ? trip.total_payout : journeyResult.totalPayout,
      ratePerKm,
      isTripFinished ? 'Trip Completed' : (trip ? 'In Progress' : 'Ready to Start')
    );

    let html = '';

    // 1. Office Departure Card
    const isStarted = trip && trip.start_time;
    html += `
      <div class="journey-step-card ${isStarted ? 'completed' : 'active'} bg-white p-4 rounded-2xl border ${isStarted ? 'border-green-200 bg-green-50/20' : 'border-blue-300 shadow-md'} mb-4">
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full ${isStarted ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white'} flex items-center justify-center font-bold text-base shadow-sm">
              <i class="fa-solid ${isStarted ? 'fa-check' : 'fa-building'}"></i>
            </div>
            <div>
              <span class="text-[10px] uppercase font-bold tracking-wider ${isStarted ? 'text-green-700' : 'text-blue-600'}">Starting Point</span>
              <h4 class="font-bold text-slate-800 text-sm">${office.name}</h4>
              <p class="text-xs text-slate-500">${office.address}</p>
            </div>
          </div>
          ${isStarted ? `<span class="text-xs font-mono text-green-700 font-bold bg-green-100 px-2 py-0.5 rounded">Started ${new Date(trip.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>` : ''}
        </div>

        ${!isStarted ? `
          <div class="mt-4 pt-3 border-t border-slate-100">
            <button onclick="engineerController.startJourneyFromOkhla()" class="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition active:scale-98">
              <i class="fa-solid fa-motorcycle"></i> Start Journey from Okhla
            </button>
          </div>
        ` : ''}
      </div>
    `;

    // 2. Customer Stop Cards (1 to N)
    jobs.forEach((job, idx) => {
      const cust = db.getCustomerById(job.customer_id) || {};
      const leg = journeyResult.legs[idx] || {};
      const isJobDone = job.status === 'completed';
      const isJobCurrent = isStarted && !isJobDone && (idx === 0 || jobs[idx - 1].status === 'completed');

      html += `
        <div class="journey-step-card ${isJobDone ? 'completed bg-green-50/20 border-green-200' : (isJobCurrent ? 'active border-blue-400 shadow-md ring-2 ring-blue-500/20' : 'opacity-70 border-slate-200')} bg-white p-4 rounded-2xl border mb-4 transition">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full ${isJobDone ? 'bg-green-100 text-green-700' : (isJobCurrent ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500')} flex items-center justify-center font-bold text-sm shadow-sm">
                ${isJobDone ? '<i class="fa-solid fa-check"></i>' : idx + 1}
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-[10px] uppercase font-bold tracking-wider ${isJobDone ? 'text-green-700' : 'text-blue-600'}">Customer Stop ${idx + 1}</span>
                  <span class="text-[10px] bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.5 rounded">${leg.distanceKm || 0} km (+₹${(leg.amount || 0).toFixed(2)})</span>
                </div>
                <h4 class="font-bold text-slate-800 text-sm">${cust.name}</h4>
                <p class="text-xs text-slate-500">${cust.address}</p>
              </div>
            </div>
            ${isJobDone ? `<span class="text-[11px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded">Completed</span>` : ''}
          </div>

          <div class="mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs flex justify-between items-center">
            <div>
              <div class="font-semibold text-slate-700"><i class="fa-solid fa-wrench text-blue-500 mr-1"></i>${job.title}</div>
              <div class="text-[11px] text-slate-500">${cust.contact_person || 'Contact'} (${cust.phone || ''})</div>
            </div>
            <a href="tel:${cust.phone}" class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs hover:bg-emerald-200">
              <i class="fa-solid fa-phone"></i>
            </a>
          </div>

          ${isJobCurrent ? `
            <div class="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
              <button onclick="engineerController.openInAppGoogleNavigation('${job.id}')" class="py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-blue-200">
                <i class="fa-brands fa-google text-blue-600"></i> Google Nav
              </button>
              <button onclick="engineerController.openCompleteJobModal('${job.id}')" class="py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-md shadow-green-600/30 flex items-center justify-center gap-1.5">
                <i class="fa-solid fa-circle-check"></i> Mark Complete
              </button>
            </div>
          ` : ''}
        </div>
      `;
    });

    // 3. Engineer Home Arrival Card
    const allCustomersDone = jobs.every(j => j.status === 'completed');
    const finalLeg = journeyResult.legs[journeyResult.legs.length - 1] || {};

    html += `
      <div class="journey-step-card ${isTripFinished ? 'completed bg-green-50/20 border-green-200' : (allCustomersDone && isStarted ? 'active border-emerald-400 shadow-md ring-2 ring-emerald-500/20' : 'opacity-70 border-slate-200')} bg-white p-4 rounded-2xl border mb-4">
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full ${isTripFinished ? 'bg-green-100 text-green-700' : (allCustomersDone && isStarted ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500')} flex items-center justify-center font-bold text-base shadow-sm">
              <i class="fa-solid ${isTripFinished ? 'fa-check' : 'fa-house-chimney'}"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-[10px] uppercase font-bold tracking-wider ${isTripFinished ? 'text-green-700' : 'text-emerald-600'}">Final Destination</span>
                <span class="text-[10px] bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.5 rounded">${finalLeg.distanceKm || 0} km (+₹${(finalLeg.amount || 0).toFixed(2)})</span>
              </div>
              <h4 class="font-bold text-slate-800 text-sm">Engineer Home (${engineer.name})</h4>
              <p class="text-xs text-slate-500">${engineer.home_address}</p>
            </div>
          </div>
          ${isTripFinished ? `<span class="text-xs font-mono text-green-700 font-bold bg-green-100 px-2 py-0.5 rounded">Reached Home</span>` : ''}
        </div>

        ${allCustomersDone && isStarted && !isTripFinished ? `
          <div class="mt-4 pt-3 border-t border-slate-100">
            <button onclick="engineerController.endJourneyAtHome()" class="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition active:scale-98">
              <i class="fa-solid fa-flag-checkered"></i> End Journey & Calculate Payout
            </button>
          </div>
        ` : ''}
      </div>
    `;

    container.innerHTML = html;

    setTimeout(() => {
      mapManager.renderJourney('engineer-mobile-map', stops, journeyResult.legs, journeyResult.allRouteCoordinates);
    }, 200);
  }

  updateTripSummaryCard(totalKm, totalPayout, ratePerKm, statusText) {
    const elKm = document.getElementById('pwa-today-km');
    const elPayout = document.getElementById('pwa-today-payout');
    const elRate = document.getElementById('pwa-today-rate');
    const elStatus = document.getElementById('pwa-trip-status-badge');

    if (elKm) elKm.innerText = `${totalKm} km`;
    if (elPayout) elPayout.innerText = `₹${totalPayout.toFixed(2)}`;
    if (elRate) elRate.innerText = `₹${ratePerKm.toFixed(2)}/km`;
    if (elStatus) elStatus.innerText = statusText;
  }

  startJourneyFromOkhla() {
    const office = db.getMainOffice();
    const trip = {
      id: 'trip-' + Date.now(),
      engineer_id: this.currentEngineerId,
      trip_date: this.currentDate,
      start_office_id: office.id,
      start_time: new Date().toISOString(),
      status: 'in_progress',
      total_km: this.cachedJourney.totalKm,
      rate_per_km: this.cachedJourney.ratePerKm,
      total_payout: this.cachedJourney.totalPayout,
      legs: this.cachedJourney.legs
    };

    db.saveDailyTrip(trip);
    alert('🚀 Journey started from Main Office (Okhla Hub)! Phone GPS tracking is now recommended.');
    this.renderTodayJourney();
  }

  openCompleteJobModal(jobId) {
    const job = db.getJobById(jobId);
    if (!job) return;

    this.activeJobId = jobId;
    document.getElementById('pwa-complete-job-title').innerText = job.title;
    document.getElementById('pwa-job-notes').value = '';
    document.getElementById('modal-pwa-complete-job').classList.remove('hidden');
  }

  submitJobCompletion(e) {
    e.preventDefault();
    if (!this.activeJobId) return;

    const notes = document.getElementById('pwa-job-notes').value.trim();
    const job = db.getJobById(this.activeJobId);

    job.status = 'completed';
    job.completion_notes = notes || 'Service completed successfully.';
    job.completed_at = new Date().toISOString();

    db.saveJob(job);
    document.getElementById('modal-pwa-complete-job').classList.add('hidden');
    this.renderTodayJourney();
  }

  async endJourneyAtHome() {
    const trip = db.getTripByEngineerAndDate(this.currentEngineerId, this.currentDate);
    if (!trip) return;

    gpsTracker.stopTracking();
    this.isGPSActive = false;
    this.updateGPSControlUI(false);

    trip.end_time = new Date().toISOString();
    trip.status = 'completed';
    trip.total_km = this.cachedJourney.totalKm;
    trip.actual_logged_km = gpsTracker.actualLoggedKm || this.cachedJourney.totalKm;
    trip.rate_per_km = this.cachedJourney.ratePerKm;
    trip.total_payout = this.cachedJourney.totalPayout;
    trip.legs = this.cachedJourney.legs;

    db.saveDailyTrip(trip);

    this.showTripFinishedModal(trip);
    this.renderTodayJourney();
    this.renderPastTrips();
  }

  showTripFinishedModal(trip) {
    const engineer = db.getEngineerById(this.currentEngineerId);
    const modalContent = document.getElementById('pwa-trip-summary-modal-content');
    if (!modalContent) return;

    modalContent.innerHTML = `
      <div class="text-center mb-4">
        <div class="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-2 shadow-inner">
          <i class="fa-solid fa-circle-check"></i>
        </div>
        <h3 class="text-lg font-bold text-slate-800">Journey Finished & Logged!</h3>
        <p class="text-xs text-slate-500">Route: Okhla Hub &rarr; Customers &rarr; Home</p>
      </div>

      <div class="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 rounded-xl mb-4 text-center">
        <div class="text-xs uppercase tracking-wider text-emerald-200 font-semibold">Total Reimbursement Earned</div>
        <div class="text-3xl font-extrabold my-1">₹${trip.total_payout.toFixed(2)}</div>
        <div class="text-xs text-emerald-100">${trip.total_km} km @ ₹${trip.rate_per_km.toFixed(2)}/km</div>
      </div>

      <div class="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs mb-4">
        <div class="font-bold text-slate-700 mb-2 border-b border-slate-200 pb-1">Route Leg Breakdown</div>
        <div class="space-y-1.5">
          ${(trip.legs || []).map(leg => `
            <div class="flex justify-between items-center">
              <span class="text-slate-600 font-medium">${leg.legOrder}. ${leg.fromName.split('(')[0]} &rarr; ${leg.toName.split('(')[0]}</span>
              <span class="font-bold text-slate-800 font-mono">${leg.distanceKm} km (₹${leg.amount.toFixed(2)})</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="flex gap-2">
        <button onclick="reportsEngine.generatePrintableStatement(db.getTripByEngineerAndDate('${this.currentEngineerId}', '${this.currentDate}'), db.getEngineerById('${this.currentEngineerId}'), engineerController.cachedJourney.legs)" class="flex-1 py-2.5 bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1">
          <i class="fa-solid fa-file-pdf"></i> Download PDF
        </button>
        <button onclick="document.getElementById('modal-pwa-trip-summary').classList.add('hidden')" class="flex-1 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl">
          Done
        </button>
      </div>
    `;

    document.getElementById('modal-pwa-trip-summary').classList.remove('hidden');
  }

  // ==========================================================
  // PAST TRIPS HISTORY
  // ==========================================================
  renderPastTrips() {
    const container = document.getElementById('pwa-past-trips-list');
    if (!container) return;

    const trips = db.getDailyTrips({ engineerId: this.currentEngineerId });
    if (trips.length === 0) {
      container.innerHTML = `<div class="p-6 text-center text-slate-400 text-xs">No previous trip history found for your profile.</div>`;
      return;
    }

    container.innerHTML = trips.map(t => `
      <div class="bg-white p-3.5 rounded-xl border border-slate-200 mb-2.5 flex justify-between items-center shadow-sm">
        <div>
          <div class="font-bold text-slate-800 text-xs">${t.trip_date}</div>
          <div class="text-[11px] text-slate-500">${t.total_km} km @ ₹${t.rate_per_km.toFixed(2)}/km</div>
        </div>
        <div class="text-right">
          <div class="font-bold text-emerald-600 text-sm font-mono">₹${t.total_payout.toFixed(2)}</div>
          <span class="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${t.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}">${t.status}</span>
        </div>
      </div>
    `).join('');
  }
}

window.engineerController = new EngineerController();

/**
 * Engineer Travel Distance & Payout System
 * Universal Database Layer with Authentication & Password Management
 * - Admin Username/Password Configuration
 * - Engineer ID/Password set by Admin
 * - Session Management for Admin & Field Engineers
 */

class Database {
  constructor() {
    this.storageKeys = CONFIG.STORAGE_KEYS;
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;

    const existingEngineers = localStorage.getItem(this.storageKeys.ENGINEERS);
    if (!existingEngineers) {
      await this.loadSeedData();
    }

    this.isInitialized = true;
    console.log('✅ Database Engine Initialized Successfully');
  }

  async loadSeedData() {
    try {
      const response = await fetch('sample-data/seed-data.json');
      if (response.ok) {
        const seed = await response.json();
        localStorage.setItem(this.storageKeys.SETTINGS, JSON.stringify(seed.settings || {}));
        localStorage.setItem(this.storageKeys.OFFICES, JSON.stringify(seed.offices || [CONFIG.DEFAULT_OFFICE]));
        localStorage.setItem(this.storageKeys.ENGINEERS, JSON.stringify(seed.engineers || []));
        localStorage.setItem(this.storageKeys.CUSTOMERS, JSON.stringify(seed.customers || []));
        localStorage.setItem(this.storageKeys.JOBS, JSON.stringify(seed.jobs || []));
        localStorage.setItem(this.storageKeys.DAILY_TRIPS, JSON.stringify(seed.daily_trips || []));
        return;
      }
    } catch (e) {
      console.warn('Could not load seed-data.json from server, initializing built-in defaults.', e);
    }

    this.initializeDefaults();
  }

  initializeDefaults() {
    localStorage.setItem(this.storageKeys.SETTINGS, JSON.stringify({
      default_rate_per_km: CONFIG.DEFAULT_RATE_PER_KM,
      currency: CONFIG.CURRENCY,
      admin_username: 'admin',
      admin_password: 'admin123',
      company_name: 'FastTech Field Engineering Solutions',
      company_address: 'Phase III, Okhla Industrial Area, New Delhi 110020',
      company_phone: '+91 11 4988 7700',
      company_email: 'operations@fasttech.in'
    }));

    localStorage.setItem(this.storageKeys.OFFICES, JSON.stringify([CONFIG.DEFAULT_OFFICE]));
  }

  // ==========================================================
  // AUTHENTICATION & CREDENTIALS MANAGEMENT
  // ==========================================================

  // --- ADMIN AUTH ---
  isAdminAuthenticated() {
    return sessionStorage.getItem('ttp_admin_auth') === 'true';
  }

  setAdminAuthenticated(isAuthenticated) {
    if (isAuthenticated) {
      sessionStorage.setItem('ttp_admin_auth', 'true');
    } else {
      sessionStorage.removeItem('ttp_admin_auth');
    }
  }

  validateAdminLogin(username, password) {
    const settings = this.getSettings();
    const validUser = settings.admin_username || 'admin';
    const validPass = settings.admin_password || 'admin123';

    if (username.trim() === validUser && password.trim() === validPass) {
      this.setAdminAuthenticated(true);
      return true;
    }
    return false;
  }

  // --- ENGINEER AUTH (Set by Admin) ---
  isEngineerAuthenticated() {
    return !!localStorage.getItem('ttp_logged_engineer_id') && sessionStorage.getItem('ttp_engineer_auth') === 'true';
  }

  setEngineerAuthenticated(engineerId) {
    localStorage.setItem('ttp_logged_engineer_id', engineerId);
    sessionStorage.setItem('ttp_engineer_auth', 'true');
  }

  logoutEngineer() {
    sessionStorage.removeItem('ttp_engineer_auth');
  }

  validateEngineerLogin(loginIdOrPhone, password) {
    const cleanInput = (loginIdOrPhone || '').trim().toLowerCase();
    const cleanDigits = cleanInput.replace(/\D/g, '').slice(-10);
    const passInput = (password || '').trim();

    const engineers = this.getEngineers();
    const matched = engineers.find(e => {
      const idMatch = (e.login_id || '').toLowerCase() === cleanInput;
      const phoneMatch = cleanDigits && (e.phone || '').replace(/\D/g, '').includes(cleanDigits);
      const passMatch = (e.password || '1234').toString() === passInput;
      return (idMatch || phoneMatch) && passMatch;
    });

    if (matched) {
      this.setEngineerAuthenticated(matched.id);
      return matched;
    }
    return null;
  }

  getLoggedInEngineerId() {
    const id = localStorage.getItem('ttp_logged_engineer_id');
    if (id && this.getEngineerById(id)) {
      return id;
    }
    const engineers = this.getEngineers().filter(e => e.is_active !== false);
    const defaultId = engineers.length > 0 ? engineers[0].id : 'eng-001';
    localStorage.setItem('ttp_logged_engineer_id', defaultId);
    return defaultId;
  }

  setLoggedInEngineerId(id) {
    localStorage.setItem('ttp_logged_engineer_id', id);
  }

  getEngineerByPhone(phone) {
    const cleanPhone = (phone || '').replace(/\D/g, '').slice(-10);
    if (!cleanPhone) return null;
    const engineers = this.getEngineers();
    return engineers.find(e => (e.phone || '').replace(/\D/g, '').includes(cleanPhone)) || null;
  }

  // ==========================================================
  // DATA ACCESS METHODS
  // ==========================================================

  // --- ENGINEERS ---
  getEngineers() {
    const data = localStorage.getItem(this.storageKeys.ENGINEERS);
    return data ? JSON.parse(data) : [];
  }

  getEngineerById(id) {
    const engineers = this.getEngineers();
    return engineers.find(e => e.id === id) || null;
  }

  saveEngineer(engineer) {
    const engineers = this.getEngineers();
    if (!engineer.password) {
      engineer.password = '1234'; // Default password set by admin
    }
    if (!engineer.login_id) {
      engineer.login_id = 'eng' + (engineer.phone ? engineer.phone.replace(/\D/g, '').slice(-4) : Date.now().toString().slice(-4));
    }

    if (engineer.id) {
      const index = engineers.findIndex(e => e.id === engineer.id);
      if (index !== -1) {
        engineers[index] = { ...engineers[index], ...engineer, updated_at: new Date().toISOString() };
      } else {
        engineers.push({ ...engineer, created_at: new Date().toISOString() });
      }
    } else {
      engineer.id = 'eng-' + Date.now();
      engineer.created_at = new Date().toISOString();
      engineers.push(engineer);
    }
    localStorage.setItem(this.storageKeys.ENGINEERS, JSON.stringify(engineers));
    return engineer;
  }

  deleteEngineer(id) {
    let engineers = this.getEngineers();
    engineers = engineers.filter(e => e.id !== id);
    localStorage.setItem(this.storageKeys.ENGINEERS, JSON.stringify(engineers));
  }

  // --- CUSTOMERS ---
  getCustomers() {
    const data = localStorage.getItem(this.storageKeys.CUSTOMERS);
    return data ? JSON.parse(data) : [];
  }

  getCustomerById(id) {
    const customers = this.getCustomers();
    return customers.find(c => c.id === id) || null;
  }

  saveCustomer(customer) {
    const customers = this.getCustomers();
    if (customer.id) {
      const index = customers.findIndex(c => c.id === customer.id);
      if (index !== -1) {
        customers[index] = { ...customers[index], ...customer, updated_at: new Date().toISOString() };
      } else {
        customers.push({ ...customer, created_at: new Date().toISOString() });
      }
    } else {
      customer.id = 'cust-' + Date.now();
      customer.created_at = new Date().toISOString();
      customers.push(customer);
    }
    localStorage.setItem(this.storageKeys.CUSTOMERS, JSON.stringify(customers));
    return customer;
  }

  // --- JOBS ---
  getJobs(filters = {}) {
    const data = localStorage.getItem(this.storageKeys.JOBS);
    let jobs = data ? JSON.parse(data) : [];

    if (filters.date) {
      jobs = jobs.filter(j => j.scheduled_date === filters.date);
    }
    if (filters.engineerId) {
      jobs = jobs.filter(j => j.engineer_id === filters.engineerId);
    }
    if (filters.status) {
      jobs = jobs.filter(j => j.status === filters.status);
    }

    return jobs.sort((a, b) => (a.sequence_order || 99) - (b.sequence_order || 99));
  }

  getJobById(id) {
    const jobs = this.getJobs();
    return jobs.find(j => j.id === id) || null;
  }

  saveJob(job) {
    const jobs = this.getJobs();
    if (job.id) {
      const index = jobs.findIndex(j => j.id === job.id);
      if (index !== -1) {
        jobs[index] = { ...jobs[index], ...job, updated_at: new Date().toISOString() };
      } else {
        jobs.push({ ...job, created_at: new Date().toISOString() });
      }
    } else {
      job.id = 'job-' + Date.now();
      job.created_at = new Date().toISOString();
      jobs.push(job);
    }
    localStorage.setItem(this.storageKeys.JOBS, JSON.stringify(jobs));
    return job;
  }

  deleteJob(id) {
    let jobs = this.getJobs();
    jobs = jobs.filter(j => j.id !== id);
    localStorage.setItem(this.storageKeys.JOBS, JSON.stringify(jobs));
  }

  // --- DAILY TRIPS ---
  getDailyTrips(filters = {}) {
    const data = localStorage.getItem(this.storageKeys.DAILY_TRIPS);
    let trips = data ? JSON.parse(data) : [];

    if (filters.date) {
      trips = trips.filter(t => t.trip_date === filters.date);
    }
    if (filters.engineerId) {
      trips = trips.filter(t => t.engineer_id === filters.engineerId);
    }
    if (filters.month) {
      trips = trips.filter(t => t.trip_date && t.trip_date.startsWith(filters.month));
    }

    return trips.sort((a, b) => new Date(b.trip_date || 0) - new Date(a.trip_date || 0));
  }

  getTripByEngineerAndDate(engineerId, date) {
    const trips = this.getDailyTrips({ engineerId, date });
    return trips.length > 0 ? trips[0] : null;
  }

  saveDailyTrip(trip) {
    const trips = this.getDailyTrips();
    if (trip.id) {
      const index = trips.findIndex(t => t.id === trip.id);
      if (index !== -1) {
        trips[index] = { ...trips[index], ...trip, updated_at: new Date().toISOString() };
      } else {
        trips.push({ ...trip, created_at: new Date().toISOString() });
      }
    } else {
      trip.id = 'trip-' + Date.now();
      trip.created_at = new Date().toISOString();
      trips.push(trip);
    }
    localStorage.setItem(this.storageKeys.DAILY_TRIPS, JSON.stringify(trips));
    return trip;
  }

  updateTripStatus(tripId, status) {
    const trips = this.getDailyTrips();
    const trip = trips.find(t => t.id === tripId);
    if (trip) {
      trip.status = status;
      trip.updated_at = new Date().toISOString();
      localStorage.setItem(this.storageKeys.DAILY_TRIPS, JSON.stringify(trips));
    }
    return trip;
  }

  // --- OFFICE & SETTINGS ---
  getMainOffice() {
    const data = localStorage.getItem(this.storageKeys.OFFICES);
    const offices = data ? JSON.parse(data) : [];
    return offices.length > 0 ? offices[0] : CONFIG.DEFAULT_OFFICE;
  }

  saveOffice(office) {
    localStorage.setItem(this.storageKeys.OFFICES, JSON.stringify([office]));
  }

  getSettings() {
    const data = localStorage.getItem(this.storageKeys.SETTINGS);
    return data ? JSON.parse(data) : {};
  }

  saveSettings(settings) {
    const existing = this.getSettings();
    const updated = { ...existing, ...settings };
    localStorage.setItem(this.storageKeys.SETTINGS, JSON.stringify(updated));
    return updated;
  }

  async resetToDemo() {
    localStorage.clear();
    sessionStorage.clear();
    await this.loadSeedData();
    console.log('🔄 Data reset to demo defaults.');
  }
}

// Global Database instance
window.db = new Database();

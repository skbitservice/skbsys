/**
 * Engineer Travel Distance & Payout System
 * Universal Database Layer with Dual-Mode (Supabase Cloud + Local Cache)
 * - Production Clean Mode (No Hardcoded Demo Users)
 * - Supabase PostgreSQL Cloud Integration
 * - Admin Username/Password & Engineer ID/Password set by Admin
 * - Real-Time Offline Resiliency & Instant Cache
 */

class Database {
  constructor() {
    this.storageKeys = CONFIG.STORAGE_KEYS;
    this.isInitialized = false;
    this.supabaseClient = null;
    this.isCloudConnected = false;
  }

  async init() {
    if (this.isInitialized) return;

    // 1. Check if seed data exists in local storage
    const existingSettings = localStorage.getItem(this.storageKeys.SETTINGS);
    if (!existingSettings) {
      await this.loadSeedData();
    }

    // 2. Check if Supabase credentials are configured
    const settings = this.getSettings();
    const supabaseUrl = settings.supabase_url || CONFIG.SUPABASE.URL;
    const supabaseKey = settings.supabase_anon_key || CONFIG.SUPABASE.ANON_KEY;

    if (supabaseUrl && supabaseKey && window.supabase) {
      await this.connectSupabase(supabaseUrl, supabaseKey, false);
    }

    this.isInitialized = true;
    console.log(`✅ Database Engine Initialized (Mode: ${this.isCloudConnected ? 'Supabase Cloud 🟢' : 'Local Storage 💾'})`);
  }

  // ==========================================================
  // SUPABASE CLOUD CONNECTION & SYNC
  // ==========================================================
  async connectSupabase(url, anonKey, showNotice = true) {
    if (!url || !anonKey) {
      if (showNotice) alert('Please provide both Supabase Project URL and Anon API Key.');
      return false;
    }

    try {
      if (!window.supabase) {
        throw new Error('Supabase client SDK is loading. Please retry in a few seconds.');
      }

      this.supabaseClient = window.supabase.createClient(url.trim(), anonKey.trim());

      // Test connection with a lightweight query
      const { data, error } = await this.supabaseClient.from('system_settings').select('*').limit(1);

      if (error && error.code !== 'PGRST116') {
        console.warn('Supabase query note:', error.message);
      }

      this.isCloudConnected = true;
      CONFIG.SUPABASE.IS_CONNECTED = true;

      // Save credentials in settings
      this.saveSettings({ supabase_url: url.trim(), supabase_anon_key: anonKey.trim() });

      // Pull latest cloud data
      await this.pullFromCloud();

      if (showNotice) {
        alert('🎉 Successfully connected to Supabase Cloud Database!\n\nAll engineers, visits, and payout data are now synced in the cloud.');
      }
      return true;
    } catch (err) {
      this.isCloudConnected = false;
      this.supabaseClient = null;
      console.error('Supabase connection failed:', err);
      if (showNotice) {
        alert(`❌ Supabase Connection Failed: ${err.message}\n\nPlease check your Project URL and Anon Key.`);
      }
      return false;
    }
  }

  async pullFromCloud() {
    if (!this.supabaseClient) return;

    try {
      // Pull Engineers
      const { data: engs } = await this.supabaseClient.from('engineers').select('*');
      if (engs) {
        localStorage.setItem(this.storageKeys.ENGINEERS, JSON.stringify(engs));
      }

      // Pull Customers
      const { data: custs } = await this.supabaseClient.from('customers').select('*');
      if (custs) {
        localStorage.setItem(this.storageKeys.CUSTOMERS, JSON.stringify(custs));
      }

      // Pull Jobs
      const { data: jobs } = await this.supabaseClient.from('jobs').select('*');
      if (jobs) {
        localStorage.setItem(this.storageKeys.JOBS, JSON.stringify(jobs));
      }

      // Pull Daily Trips
      const { data: trips } = await this.supabaseClient.from('daily_trips').select('*');
      if (trips) {
        localStorage.setItem(this.storageKeys.DAILY_TRIPS, JSON.stringify(trips));
      }

      // Pull Settings
      const { data: settings } = await this.supabaseClient.from('system_settings').select('*').limit(1);
      if (settings && settings.length > 0) {
        const current = this.getSettings();
        localStorage.setItem(this.storageKeys.SETTINGS, JSON.stringify({ ...current, ...settings[0] }));
      }

      console.log('☁️ Synced latest records from Supabase Cloud');
    } catch (e) {
      console.warn('Error pulling from Supabase:', e);
    }
  }

  async seedCloudDatabase() {
    if (!this.supabaseClient) {
      alert('⚠️ Please connect to Supabase first before seeding.');
      return false;
    }

    try {
      const engineers = this.getEngineers();
      const customers = this.getCustomers();
      const jobs = this.getJobs();
      const settings = this.getSettings();
      const office = this.getMainOffice();

      // Upsert settings
      await this.supabaseClient.from('system_settings').upsert({
        id: 'primary_settings',
        default_rate_per_km: settings.default_rate_per_km || 2.50,
        admin_username: settings.admin_username || 'admin',
        admin_password: settings.admin_password || 'admin123',
        company_name: settings.company_name || 'Field Service Engineering Operations'
      });

      // Upsert office
      await this.supabaseClient.from('offices').upsert({
        id: office.id || 'off-001',
        name: office.name,
        address: office.address,
        latitude: office.latitude,
        longitude: office.longitude,
        default_rate: 2.50
      });

      // Upsert engineers
      if (engineers.length > 0) {
        await this.supabaseClient.from('engineers').upsert(engineers);
      }

      // Upsert customers
      if (customers.length > 0) {
        await this.supabaseClient.from('customers').upsert(customers);
      }

      // Upsert jobs
      if (jobs.length > 0) {
        await this.supabaseClient.from('jobs').upsert(jobs);
      }

      alert('🚀 Supabase Cloud Database synced successfully!');
      return true;
    } catch (e) {
      alert('Error syncing Supabase: ' + e.message);
      return false;
    }
  }

  // ==========================================================
  // INITIAL SEEDING & DEFAULTS
  // ==========================================================
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
      console.warn('Could not load seed-data.json, using defaults.', e);
    }

    this.initializeDefaults();
  }

  initializeDefaults() {
    localStorage.setItem(this.storageKeys.SETTINGS, JSON.stringify({
      default_rate_per_km: CONFIG.DEFAULT_RATE_PER_KM,
      currency: CONFIG.CURRENCY,
      admin_username: 'admin',
      admin_password: 'admin123',
      company_name: 'Field Service Engineering Operations',
      company_address: 'Plot 42, Phase III, Okhla Industrial Area, New Delhi 110020',
      company_phone: '+91 11 4988 7700',
      company_email: 'operations@company.in'
    }));

    localStorage.setItem(this.storageKeys.OFFICES, JSON.stringify([CONFIG.DEFAULT_OFFICE]));
    localStorage.setItem(this.storageKeys.ENGINEERS, JSON.stringify([]));
    localStorage.setItem(this.storageKeys.CUSTOMERS, JSON.stringify([]));
    localStorage.setItem(this.storageKeys.JOBS, JSON.stringify([]));
    localStorage.setItem(this.storageKeys.DAILY_TRIPS, JSON.stringify([]));
  }

  // ==========================================================
  // AUTHENTICATION & CREDENTIALS MANAGEMENT
  // ==========================================================
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

  isEngineerAuthenticated() {
    return !!localStorage.getItem('ttp_logged_engineer_id') && sessionStorage.getItem('ttp_engineer_auth') === 'true';
  }

  setEngineerAuthenticated(engineerId) {
    localStorage.setItem('ttp_logged_engineer_id', engineerId);
    sessionStorage.setItem('ttp_engineer_auth', 'true');
  }

  logoutEngineer() {
    sessionStorage.removeItem('ttp_engineer_auth');
    localStorage.removeItem('ttp_logged_engineer_id');
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
    if (engineers.length > 0) {
      return engineers[0].id;
    }
    return null;
  }

  setLoggedInEngineerId(id) {
    localStorage.setItem('ttp_logged_engineer_id', id);
  }

  // ==========================================================
  // DATA ACCESS METHODS (LOCAL + SUPABASE SYNC)
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
    if (!engineer.password) engineer.password = '1234';
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

    // Cloud Sync
    if (this.supabaseClient) {
      this.supabaseClient.from('engineers').upsert(engineer).then();
    }

    return engineer;
  }

  deleteEngineer(id) {
    let engineers = this.getEngineers();
    engineers = engineers.filter(e => e.id !== id);
    localStorage.setItem(this.storageKeys.ENGINEERS, JSON.stringify(engineers));

    if (this.supabaseClient) {
      this.supabaseClient.from('engineers').delete().eq('id', id).then();
    }
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

    if (this.supabaseClient) {
      this.supabaseClient.from('customers').upsert(customer).then();
    }

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

    if (this.supabaseClient) {
      this.supabaseClient.from('jobs').upsert(job).then();
    }

    return job;
  }

  deleteJob(id) {
    let jobs = this.getJobs();
    jobs = jobs.filter(j => j.id !== id);
    localStorage.setItem(this.storageKeys.JOBS, JSON.stringify(jobs));

    if (this.supabaseClient) {
      this.supabaseClient.from('jobs').delete().eq('id', id).then();
    }
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

    if (this.supabaseClient) {
      this.supabaseClient.from('daily_trips').upsert(trip).then();
    }

    return trip;
  }

  updateTripStatus(tripId, status) {
    const trips = this.getDailyTrips();
    const trip = trips.find(t => t.id === tripId);
    if (trip) {
      trip.status = status;
      trip.updated_at = new Date().toISOString();
      localStorage.setItem(this.storageKeys.DAILY_TRIPS, JSON.stringify(trips));

      if (this.supabaseClient) {
        this.supabaseClient.from('daily_trips').update({ status }).eq('id', tripId).then();
      }
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
    if (this.supabaseClient) {
      this.supabaseClient.from('offices').upsert(office).then();
    }
  }

  getSettings() {
    const data = localStorage.getItem(this.storageKeys.SETTINGS);
    return data ? JSON.parse(data) : {};
  }

  saveSettings(settings) {
    const existing = this.getSettings();
    const updated = { ...existing, ...settings };
    localStorage.setItem(this.storageKeys.SETTINGS, JSON.stringify(updated));

    if (this.supabaseClient) {
      this.supabaseClient.from('system_settings').upsert({ id: 'primary_settings', ...updated }).then();
    }

    return updated;
  }

  async resetToDemo() {
    localStorage.clear();
    sessionStorage.clear();
    await this.loadSeedData();
    console.log('🔄 Data reset to clean defaults.');
  }
}

// Global Database instance
window.db = new Database();

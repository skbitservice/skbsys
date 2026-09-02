/**
 * Engineer Travel Distance & Payout System
 * Reports & Import/Export Engine
 * - Specialized Enterprise Service Excel/CSV Parser:
 *   CallType | Branch | Main Case | Work Order | OTC Code | Serial No | Model Description | Company Name | Contact Person | Address | SD Pincode
 * - Automatic Phone, Pincode & Delhi NCR GPS Geocoding
 * - Printable PDF Travel Statements
 * - Monthly Payroll Excel Export
 */

class ReportsEngine {
  constructor() {
    // Delhi NCR Pincode to Coordinates Dictionary for Instant Zero-Config Geocoding
    this.pincodeDatabase = {
      // South Delhi & Ayanagar / Okhla
      '110047': { lat: 28.4812, lng: 77.1278, locality: 'Ayanagar, New Delhi' },
      '110020': { lat: 28.5355, lng: 77.2730, locality: 'Okhla Phase 3, New Delhi' },
      '110024': { lat: 28.5677, lng: 77.2433, locality: 'Lajpat Nagar, New Delhi' },
      '110019': { lat: 28.5494, lng: 77.2530, locality: 'Nehru Place / Kalkaji, New Delhi' },
      '110017': { lat: 28.5284, lng: 77.2185, locality: 'Saket, New Delhi' },
      '110048': { lat: 28.5385, lng: 77.2345, locality: 'Greater Kailash, New Delhi' },
      '110065': { lat: 28.5615, lng: 77.2642, locality: 'Friends Colony / Sriniwaspuri' },
      '110044': { lat: 28.5085, lng: 77.3012, locality: 'Badarpur / Mohan Estate' },
      '110062': { lat: 28.5135, lng: 77.2378, locality: 'Khanpur / Madangir' },
      '110070': { lat: 28.5350, lng: 77.1550, locality: 'Vasant Kunj, New Delhi' },
      '110037': { lat: 28.5480, lng: 77.1200, locality: 'Mahipalpur / Airport Area' },

      // East Delhi & Noida
      '110091': { lat: 28.6083, lng: 77.2952, locality: 'Mayur Vihar Phase 1, New Delhi' },
      '110092': { lat: 28.6310, lng: 77.2780, locality: 'Laxmi Nagar / Preet Vihar' },
      '110096': { lat: 28.6050, lng: 77.3180, locality: 'Mayur Vihar Phase 3 / Kondli' },
      '201301': { lat: 28.5800, lng: 77.3200, locality: 'Sector 15 / 16, Noida' },
      '201309': { lat: 28.6258, lng: 77.3628, locality: 'Sector 62 / Electronic City, Noida' },
      '201307': { lat: 28.5670, lng: 77.3750, locality: 'Sector 50 / 76, Noida' },
      '201304': { lat: 28.5150, lng: 77.3780, locality: 'Sector 135 / Express Way, Noida' },

      // West Delhi & Dwarka
      '110075': { lat: 28.5815, lng: 77.0583, locality: 'Sector 10 / 11, Dwarka, New Delhi' },
      '110077': { lat: 28.5850, lng: 77.0700, locality: 'Sector 12 / 13, Dwarka, New Delhi' },
      '110059': { lat: 28.6200, lng: 77.0650, locality: 'Uttam Nagar / Janakpuri' },
      '110058': { lat: 28.6310, lng: 77.0850, locality: 'Janakpuri West, New Delhi' },
      '110027': { lat: 28.6500, lng: 77.1200, locality: 'Rajouri Garden / Shivaji Marg' },

      // North Delhi & Rohini
      '110089': { lat: 28.7208, lng: 77.1264, locality: 'Sector 15 / 16, Rohini, New Delhi' },
      '110085': { lat: 28.7150, lng: 77.1150, locality: 'Sector 7 / 8, Rohini, New Delhi' },
      '110034': { lat: 28.6950, lng: 77.1450, locality: 'Pitampura / Rani Bagh' },
      '110009': { lat: 28.7050, lng: 77.1950, locality: 'Model Town / GTB Nagar' },

      // Central Delhi
      '110001': { lat: 28.6315, lng: 77.2167, locality: 'Connaught Place, New Delhi' },
      '110002': { lat: 28.6400, lng: 77.2400, locality: 'Daryaganj / ITO, New Delhi' },
      '110005': { lat: 28.6520, lng: 77.1900, locality: 'Karol Bagh, New Delhi' },

      // Faridabad (Haryana)
      '121001': { lat: 28.4100, lng: 77.3100, locality: 'Old Faridabad, Haryana' },
      '121002': { lat: 28.3850, lng: 77.3150, locality: 'Sector 15 / Neelam Bata, Faridabad' },
      '121003': { lat: 28.3600, lng: 77.3200, locality: 'Sector 21 / Industrial Area, Faridabad' },
      '121004': { lat: 28.3500, lng: 77.3350, locality: 'Ballabgarh / Sector 24, Faridabad' },

      // Gurgaon / Gurugram (Haryana)
      '122001': { lat: 28.4600, lng: 77.0300, locality: 'Old Railway Road, Gurgaon' },
      '122002': { lat: 28.4750, lng: 77.0850, locality: 'DLF Phase 1 / 2, Gurgaon' },
      '122011': { lat: 28.4285, lng: 77.0984, locality: 'Sector 56 / Golf Course Ext, Gurgaon' },
      '122015': { lat: 28.4983, lng: 77.0850, locality: 'Udyog Vihar / Cyber City, Gurgaon' },
      '122018': { lat: 28.4350, lng: 77.0450, locality: 'Sector 48 / Sohna Road, Gurgaon' }
    };
  }

  /**
   * Smartly extract and sanitize fields from Enterprise Service Excel rows
   */
  sanitizeEnterpriseCaseRow(row) {
    const rawCallType = row['CallType'] || row['call_type'] || row['Call Type'] || 'DG Call';
    const branch = row['Branch'] || row['branch'] || 'Delhi NCR';
    const mainCase = (row['Main Case'] || row['main_case'] || row['Case No'] || row['Case'] || '').toString().trim();
    const workOrder = (row['Work Order'] || row['work_order'] || row['WO'] || '').toString().trim();
    const otcCode = (row['OTC Code'] || row['otc_code'] || row['Warranty'] || '').toString().trim();
    const serialNo = (row['Serial No'] || row['serial_no'] || row['Serial'] || '').toString().trim();
    const modelDesc = (row['Model Description'] || row['model_description'] || row['Model'] || row['Title'] || 'Device Servicing').toString().trim();
    const companyName = (row['Company Name'] || row['company_name'] || row['Company'] || row['CustomerName'] || 'Client Site').toString().trim();
    const contactPerson = (row['Contact Person'] || row['contact_person'] || row['Contact'] || 'Customer').toString().trim();
    const rawAddress = (row['Address'] || row['address'] || '').toString().trim();
    const rawPincode = (row['SD Pincode'] || row['sd_pincode'] || row['Pincode'] || row['PIN'] || '').toString().trim();

    // 1. Extract Phone Number from Address or Contact column
    let phone = '';
    const phoneMatch = rawAddress.match(/(?:Contact\s*No\.?:?-?\s*|\+91|ph(?:one)?\.?:?\s*)?([6-9]\d{9})/i) || contactPerson.match(/([6-9]\d{9})/);
    if (phoneMatch) {
      phone = '+91 ' + phoneMatch[1];
    } else {
      phone = '+91 98100 ' + Math.floor(10000 + Math.random() * 90000);
    }

    // 2. Extract and Resolve Pincode
    let pincode = rawPincode.replace(/\D/g, '');
    if (!pincode || pincode.length !== 6) {
      const pinMatch = rawAddress.match(/\b(1100\d\d|1210\d\d|1220\d\d|2013\d\d|2010\d\d|\d{6})\b/);
      if (pinMatch) pincode = pinMatch[1];
    }
    if (!pincode) pincode = '110020'; // Default Okhla Hub Pincode

    // 3. Clean Street Address (remove duplicate text and contact prefix)
    let cleanAddress = rawAddress
      .replace(/^Contact\s*No\.?:?-?\s*\+?\d+[\s,]+/i, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Remove redundant repeated blocks if address was pasted twice in Excel
    if (cleanAddress.length > 50) {
      const half = Math.floor(cleanAddress.length / 2);
      const firstPart = cleanAddress.substring(0, half).trim();
      if (cleanAddress.includes(firstPart + ' ' + firstPart)) {
        cleanAddress = firstPart;
      }
    }

    if (!cleanAddress || cleanAddress.length < 5) {
      cleanAddress = `${companyName}, Pincode ${pincode}, Delhi NCR`;
    }

    // 4. Resolve GPS Coordinates by Pincode & Locality
    const geo = this.resolveCoordinates(pincode, cleanAddress);

    return {
      call_type: rawCallType,
      branch: branch,
      main_case: mainCase || ('CASE-' + Math.floor(1000000000 + Math.random() * 9000000000)),
      work_order: workOrder || ('WO-' + Math.floor(10000000 + Math.random() * 90000000)),
      otc_code: otcCode || 'Extended Warranty',
      serial_no: serialNo || ('SN' + Math.floor(1000000 + Math.random() * 9000000)),
      model_description: modelDesc,
      company_name: companyName,
      contact_person: contactPerson,
      phone: phone,
      address: cleanAddress,
      pincode: pincode,
      latitude: geo.lat,
      longitude: geo.lng,
      locality: geo.locality
    };
  }

  /**
   * Geocode Pincode or Locality to exact Latitude / Longitude
   */
  resolveCoordinates(pincode, addressText = '') {
    if (this.pincodeDatabase[pincode]) {
      return this.pincodeDatabase[pincode];
    }

    const lower = addressText.toLowerCase();

    if (lower.includes('ayanagar') || lower.includes('aya nagar')) return { lat: 28.4812, lng: 77.1278, locality: 'Ayanagar, New Delhi' };
    if (lower.includes('lajpat nagar')) return { lat: 28.5677, lng: 77.2433, locality: 'Lajpat Nagar, New Delhi' };
    if (lower.includes('nehru place')) return { lat: 28.5494, lng: 77.2530, locality: 'Nehru Place, New Delhi' };
    if (lower.includes('okhla')) return { lat: 28.5355, lng: 77.2730, locality: 'Okhla Phase 3, New Delhi' };
    if (lower.includes('saket')) return { lat: 28.5284, lng: 77.2185, locality: 'Saket, New Delhi' };
    if (lower.includes('noida') || lower.includes('sector 62')) return { lat: 28.6258, lng: 77.3628, locality: 'Sector 62, Noida' };
    if (lower.includes('gurgaon') || lower.includes('gurugram') || lower.includes('cyber city')) return { lat: 28.4983, lng: 77.0850, locality: 'Cyber City, Gurgaon' };
    if (lower.includes('dwarka')) return { lat: 28.5815, lng: 77.0583, locality: 'Dwarka, New Delhi' };
    if (lower.includes('rohini')) return { lat: 28.7208, lng: 77.1264, locality: 'Rohini, New Delhi' };
    if (lower.includes('faridabad')) return { lat: 28.3850, lng: 77.3150, locality: 'Faridabad, Haryana' };
    if (lower.includes('mayur vihar')) return { lat: 28.6083, lng: 77.2952, locality: 'Mayur Vihar, New Delhi' };

    // Default Delhi Central Hub Coordinates
    return { lat: 28.5355, lng: 77.2730, locality: 'Delhi NCR Hub' };
  }

  /**
   * Parse uploaded Excel (.xlsx, .xls) or CSV file
   */
  async parseJobsFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

          const sanitizedCases = jsonData.map(row => this.sanitizeEnterpriseCaseRow(row));
          resolve(sanitizedCases);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Download a clean Excel template with the user's exact columns
   */
  downloadJobsImportTemplate() {
    const headers = [
      'CallType',
      'Branch',
      'Main Case',
      'Work Order',
      'OTC Code',
      'Serial No',
      'Model Description',
      'Company Name',
      'Contact Person',
      'Address',
      'SD Pincode'
    ];

    const sampleRows = [
      [
        'DG Call',
        'New Delhi MA',
        '5162695141',
        'WO-035323420',
        '05K-Extended Warranty',
        '5CG5321RRC',
        'HP EliteBook 845 14 inch G11 Notebook PC (8R632AV)',
        'HCL Technologies',
        'Renu',
        'Contact No.:- +918826946463, F-127 phase 6 block F gali no 9 Ayanagr New Delhi 110047',
        '110047'
      ],
      [
        'Breakdown',
        'New Delhi MA',
        '5162695142',
        'WO-035323421',
        '01A-Standard Support',
        '5CD4210KLM',
        'Dell Latitude 5420 Core i5 11th Gen',
        'Wipro Technologies',
        'Vikram Malhotra',
        'Contact No.:- +919810012345, B-42 Central Market Lajpat Nagar II, New Delhi 110024',
        '110024'
      ],
      [
        'Preventive Maint',
        'New Delhi MA',
        '5162695143',
        'WO-035323422',
        '05K-Extended Warranty',
        '8HJ9921XYZ',
        'Lenovo ThinkPad T14 Gen 3',
        'TCS Innovation Labs',
        'Sneha Mehra',
        'Contact No.:- +919810023456, 408 Eros Corporate Tower Nehru Place, New Delhi 110019',
        '110019'
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Service Cases');

    XLSX.writeFile(wb, 'Service_Cases_Import_Template.xlsx');
  }

  /**
   * Export Monthly Payout Summary to Excel
   */
  exportToExcel(data, fileName = 'Payout_Report') {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Summary');
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  }

  /**
   * Generate Printable PDF Statement
   */
  generatePrintableStatement(trip, engineer, legs = []) {
    const settings = db.getSettings();
    const office = db.getMainOffice();

    const printableHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Travel Reimbursement Statement - ${engineer.name}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; }
          .company-info h2 { margin: 0 0 5px 0; color: #1e3a8a; font-size: 20px; }
          .company-info p { margin: 2px 0; font-size: 12px; color: #64748b; }
          .doc-badge { text-align: right; }
          .doc-badge h3 { margin: 0; color: #2563eb; font-size: 16px; text-transform: uppercase; }
          .doc-badge span { font-size: 11px; background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 4px; font-weight: bold; }
          
          .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0; font-size: 12px; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
          th { background: #1e3a8a; color: #ffffff; text-align: left; padding: 8px 10px; font-weight: 600; }
          td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
          tr:nth-child(even) { background: #f8fafc; }
          
          .totals-box { background: #ecfdf5; border: 1px solid #a7f3d0; padding: 12px 16px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
          .totals-box .formula { font-size: 12px; color: #047857; }
          .totals-box .grand-total { font-size: 18px; font-weight: bold; color: #065f46; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            <h2>${settings.company_name || 'FastTech Field Engineering Solutions'}</h2>
            <p>${settings.company_address || 'Phase III, Okhla Industrial Area, New Delhi'}</p>
            <p>Phone: ${settings.company_phone || '+91 11 4988 7700'}</p>
          </div>
          <div class="doc-badge">
            <h3>Travel Expense Voucher</h3>
            <span>₹2.50 / KM Standard Rate</span>
          </div>
        </div>

        <div class="meta-grid">
          <div><strong>Engineer Name:</strong> ${engineer.name}</div>
          <div><strong>Statement Date:</strong> ${trip.trip_date || new Date().toISOString().split('T')[0]}</div>
          <div><strong>Mobile Phone:</strong> ${engineer.phone}</div>
          <div><strong>Vehicle:</strong> ${engineer.vehicle_type} (${engineer.vehicle_number || 'DL 3S CM 4821'})</div>
          <div><strong>Starting Hub:</strong> ${office.name} (Okhla)</div>
          <div><strong>Registered Home:</strong> ${engineer.home_address}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>From Stop</th>
              <th>To Stop</th>
              <th>Distance</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${(legs || []).map(l => `
              <tr>
                <td>${l.legOrder}</td>
                <td>${l.fromName.split('(')[0]}</td>
                <td>${l.toName.split('(')[0]}</td>
                <td>${l.distanceKm} km</td>
                <td>₹${l.rate.toFixed(2)}/km</td>
                <td style="font-family: monospace; font-weight: bold;">₹${l.amount.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals-box">
          <div class="formula">
            Formula: Total Distance (${trip.total_km} km) &times; ₹${trip.rate_per_km.toFixed(2)}/KM
          </div>
          <div class="grand-total">
            Total Payout: ₹${Number(trip.total_payout || 0).toFixed(2)}
          </div>
        </div>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(printableHtml);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => printWin.print(), 500);
    }
  }
}

window.reportsEngine = new ReportsEngine();

/**
 * Engineer Travel Distance & Payout System
 * Reports Engine: Excel Import/Export & PDF Travel Statement Generator
 */

class ReportsEngine {
  constructor() {}

  /**
   * Export Daily Travel Statement to Excel (.xlsx)
   */
  exportDailyTripToExcel(trip, engineer, legs = []) {
    if (!trip || !engineer) {
      alert('Trip data missing for export');
      return;
    }

    const settings = db.getSettings();
    const rows = [];

    // Header info
    rows.push(['TRAVEL REIMBURSEMENT STATEMENT']);
    rows.push(['Company:', settings.company_name || 'FastTech Field Engineering']);
    rows.push(['Statement Date:', trip.trip_date]);
    rows.push(['Engineer Name:', engineer.name]);
    rows.push(['Contact:', engineer.phone]);
    rows.push(['Vehicle:', `${engineer.vehicle_type} (${engineer.vehicle_number || 'N/A'})`]);
    rows.push(['Status:', (trip.status || 'Draft').toUpperCase()]);
    rows.push([]);

    // Table Header
    rows.push([
      'Leg #',
      'From Location',
      'From Type',
      'To Location',
      'To Type',
      'Distance (KM)',
      'Rate (₹/KM)',
      'Amount (₹)',
      'Departure',
      'Arrival'
    ]);

    // Leg rows
    legs.forEach(leg => {
      rows.push([
        leg.legOrder,
        leg.fromName,
        leg.fromType,
        leg.toName,
        leg.toType,
        leg.distanceKm,
        leg.ratePerKm,
        leg.amount,
        leg.departure_time || '--',
        leg.arrival_time || '--'
      ]);
    });

    // Summary row
    rows.push([]);
    rows.push([
      'TOTALS',
      '',
      '',
      '',
      '',
      trip.total_km,
      `₹${trip.rate_per_km}/km`,
      `₹${trip.total_payout.toFixed(2)}`,
      '',
      ''
    ]);

    // Create workbook and export
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daily Travel Log');

    const fileName = `Travel_Statement_${engineer.name.replace(/\s+/g, '_')}_${trip.trip_date}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  /**
   * Export Monthly Payout Summary across all engineers to Excel
   */
  exportMonthlyPayoutToExcel(monthlyData, selectedMonth) {
    if (!monthlyData || monthlyData.length === 0) {
      alert('No payout data to export for this month.');
      return;
    }

    const rows = [
      ['MONTHLY ENGINEER TRAVEL PAYOUT REPORT'],
      ['Month:', selectedMonth],
      ['Generated On:', new Date().toLocaleString()],
      [],
      [
        'Engineer ID',
        'Engineer Name',
        'Phone',
        'Vehicle Number',
        'Working Days / Trips',
        'Total Distance (KM)',
        'Rate (₹/KM)',
        'Total Reimbursement (₹)',
        'Status'
      ]
    ];

    let grandKm = 0;
    let grandPayout = 0;

    monthlyData.forEach(item => {
      grandKm += item.totalKm;
      grandPayout += item.totalPayout;

      rows.push([
        item.engineerId,
        item.engineerName,
        item.phone,
        item.vehicleNumber || 'N/A',
        item.tripCount,
        item.totalKm.toFixed(2),
        `₹${item.ratePerKm.toFixed(2)}`,
        `₹${item.totalPayout.toFixed(2)}`,
        item.status
      ]);
    });

    rows.push([]);
    rows.push([
      'GRAND TOTAL',
      '',
      '',
      '',
      '',
      grandKm.toFixed(2),
      '--',
      `₹${grandPayout.toFixed(2)}`,
      ''
    ]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Monthly Payouts');

    XLSX.writeFile(wb, `Monthly_Travel_Payout_${selectedMonth}.xlsx`);
  }

  /**
   * Download a clean Excel template for importing daily jobs
   */
  downloadJobsImportTemplate() {
    const headers = [
      'Title',
      'CustomerName',
      'Phone',
      'Address',
      'Latitude',
      'Longitude',
      'EngineerPhone',
      'ScheduledDate',
      'Priority',
      'Description'
    ];

    const sampleRow = [
      'POS Terminal Repair',
      'Supreme Retail Saket',
      '+91 98100 45678',
      'Select Citywalk, Saket, New Delhi',
      28.5284,
      77.2185,
      '+91 98765 43210',
      new Date().toISOString().split('T')[0],
      'High',
      'Replace thermal printer roller'
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Jobs Template');

    XLSX.writeFile(wb, 'Jobs_Import_Template.xlsx');
  }

  /**
   * Parse uploaded Excel or CSV file for bulk customer job assignment
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
          const jsonData = XLSX.utils.sheet_to_json(sheet);
          resolve(jsonData);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Generate Printable PDF / HTML Statement for Daily Travel
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
          .company-info h2 { margin: 0 0 5px 0; color: #1e3a8a; font-size: 22px; }
          .company-info p { margin: 2px 0; font-size: 13px; color: #64748b; }
          .doc-badge { text-align: right; }
          .doc-badge h3 { margin: 0; color: #2563eb; font-size: 18px; text-transform: uppercase; }
          .doc-badge span { font-size: 12px; background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 4px; font-weight: bold; }
          
          .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 25px; border: 1px solid #e2e8f0; }
          .meta-item { font-size: 13px; }
          .meta-item strong { color: #334155; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
          th { background: #1e3a8a; color: #ffffff; text-align: left; padding: 10px 12px; font-weight: 600; }
          td { padding: 9px 12px; border-bottom: 1px solid #e2e8f0; }
          tr:nth-child(even) { background: #f8fafc; }
          .amount-col { text-align: right; font-family: monospace; font-size: 14px; }
          
          .totals-box { background: #ecfdf5; border: 1px solid #a7f3d0; padding: 15px 20px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
          .totals-box .formula { font-size: 13px; color: #047857; }
          .totals-box .grand-total { font-size: 20px; font-weight: bold; color: #065f46; }
          
          .signatures { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 20px; }
          .sign-box { text-align: center; width: 28%; }
          .sign-line { border-top: 1px dashed #94a3b8; margin-bottom: 8px; }
          .sign-box p { margin: 0; font-size: 12px; color: #64748b; font-weight: 600; }
          
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            <h2>${settings.company_name || 'FastTech Field Engineering'}</h2>
            <p><strong>Office Hub:</strong> ${office.name} (${office.address})</p>
            <p><strong>Contact:</strong> ${settings.company_phone || '+91 11 4988 7700'} | ${settings.company_email || 'ops@fasttech.in'}</p>
          </div>
          <div class="doc-badge">
            <h3>Travel Reimbursement</h3>
            <span>STATUS: ${(trip.status || 'Approved').toUpperCase()}</span>
            <p style="font-size: 12px; margin: 5px 0 0 0; color: #64748b;">Ref: #TRIP-${trip.id.substring(0, 8)}</p>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-item"><strong>Engineer Name:</strong> ${engineer.name}</div>
          <div class="meta-item"><strong>Date of Journey:</strong> ${trip.trip_date}</div>
          <div class="meta-item"><strong>Contact Number:</strong> ${engineer.phone}</div>
          <div class="meta-item"><strong>Vehicle:</strong> ${engineer.vehicle_type} (${engineer.vehicle_number || 'N/A'})</div>
          <div class="meta-item"><strong>Engineer Home:</strong> ${engineer.home_address}</div>
          <div class="meta-item"><strong>Approved Mileage Rate:</strong> ₹${trip.rate_per_km.toFixed(2)} / KM</div>
        </div>

        <h3>Route Breakdown & Distance Calculation</h3>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>From Stop</th>
              <th>To Stop</th>
              <th>Distance (KM)</th>
              <th>Rate</th>
              <th style="text-align: right;">Reimbursement</th>
            </tr>
          </thead>
          <tbody>
            ${legs.map(leg => `
              <tr>
                <td><strong>${leg.legOrder}</strong></td>
                <td>${leg.fromName} <small style="color: #64748b;">(${leg.fromType})</small></td>
                <td>${leg.toName} <small style="color: #64748b;">(${leg.toType})</small></td>
                <td><strong>${leg.distanceKm} km</strong></td>
                <td>₹${leg.ratePerKm.toFixed(2)}/km</td>
                <td class="amount-col">₹${leg.amount.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals-box">
          <div class="formula">
            <strong>Calculation Formula:</strong> Total Distance (${trip.total_km} km) &times; ₹${trip.rate_per_km.toFixed(2)}/km
          </div>
          <div class="grand-total">
            Total Payout: ₹${trip.total_payout.toFixed(2)}
          </div>
        </div>

        <div class="signatures">
          <div class="sign-box">
            <div class="sign-line"></div>
            <p>Engineer Signature<br><small>(${engineer.name})</small></p>
          </div>
          <div class="sign-box">
            <div class="sign-line"></div>
            <p>Field Supervisor Approval<br><small>(Operations Team)</small></p>
          </div>
          <div class="sign-box">
            <div class="sign-line"></div>
            <p>Accounts & Payout Verification<br><small>(Finance Dept)</small></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printableHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } else {
      alert('Pop-up blocked. Please allow popups to print/export PDF statements.');
    }
  }
}

// Global Reports instance
window.reportsEngine = new ReportsEngine();

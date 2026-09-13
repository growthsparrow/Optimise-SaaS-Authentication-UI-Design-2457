import * as XLSX from 'xlsx';
import {jsPDF} from 'jspdf';
import autoTable from 'jspdf-autotable';

function formatDate(dateValue) {
  if (!dateValue) {
    return 'Not provided';
  }

  return new Date(`${dateValue}T12:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function getRows(bookings) {
  return bookings.map((booking) => ({
    'Patient Name': booking.patient_name || 'Not provided',
    'Contact Number': booking.phone_number || 'Not provided',
    'Booking ID': booking.booking_id || 'Not provided',
    'Date': formatDate(booking.booking_date),
    'Time': booking.booking_time || 'Not provided',
    'Doctor Name': booking.doctor?.doctor_name || 'Not assigned',
    'Consultation Type': booking.consultation?.consultation_name || 'Not provided',
    'Location Name': booking.location?.location_name || 'Not provided',
    'Location Address': booking.location?.address || 'Not provided',
    'Location Contact': booking.location?.contact_number || 'Not provided',
    'Status': booking.status?.replace('_', ' ') || 'Not provided'
  }));
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportAppointmentsToExcel(bookings) {
  const worksheet = XLSX.utils.json_to_sheet(getRows(bookings));
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Appointments');
  XLSX.writeFile(workbook, `optimise-appointments-${Date.now()}.xlsx`);
}

export function exportAppointmentsToPdf(bookings) {
  const document = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  document.setFontSize(16);
  document.text('Optimise Appointments', 14, 15);
  document.setFontSize(9);
  document.text(
    `Exported ${new Date().toLocaleString('en-IN')}`,
    14,
    22
  );

  autoTable(document, {
    startY: 28,
    head: [[
      'Patient',
      'Contact',
      'Booking ID',
      'Date',
      'Time',
      'Doctor',
      'Consultation',
      'Location',
      'Address',
      'Status'
    ]],
    body: getRows(bookings).map((row) => [
      row['Patient Name'],
      row['Contact Number'],
      row['Booking ID'],
      row.Date,
      row.Time,
      row['Doctor Name'],
      row['Consultation Type'],
      row['Location Name'],
      row['Location Address'],
      row.Status
    ]),
    styles: {
      fontSize: 7,
      cellPadding: 2,
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [7, 155, 170],
      textColor: 255
    },
    columnStyles: {
      0: {cellWidth: 25},
      1: {cellWidth: 22},
      2: {cellWidth: 24},
      3: {cellWidth: 22},
      4: {cellWidth: 18},
      5: {cellWidth: 27},
      6: {cellWidth: 27},
      7: {cellWidth: 25},
      8: {cellWidth: 47},
      9: {cellWidth: 20}
    }
  });

  const blob = document.output('blob');
  downloadBlob(blob, `optimise-appointments-${Date.now()}.pdf`);
}
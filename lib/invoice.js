const PDFDocument = require('pdfkit');
const fs = require('node:fs');
const path = require('node:path');
const { maskCivilId } = require('./mask');
const { t } = require('./i18n');
// On-the-fly English invoice; no PDF or personal data is persisted on the server.
function invoiceDocument(subscription, parent) {
  const doc = new PDFDocument({ size: 'A4', margin: 44, info: { Title: subscription.invoice_number, Author: t('en','meta.siteName') } });
  const text = key => t('en', 'invoice.' + key);
  const money = n => `KWD ${Number(n).toFixed(3)}`;
  const date = value => new Date(value).toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric',timeZone:'Asia/Kuwait'});
  const logo = path.join(__dirname, '../public/images/brand/evo360logo.png');
  if (fs.existsSync(logo)) { doc.save().rect(44,44,170,62).fill('#0B1526'); doc.image(logo,54,53,{fit:[150,44]}); doc.restore(); }
  doc.fillColor('#0B1526').font('Helvetica-Bold').fontSize(22).text(t('en','meta.siteName'),240,48,{width:310,align:'right'});
  doc.font('Helvetica').fontSize(10).text(t('en','footer.address'),240,78,{width:310,align:'right'})
    .text('info@evo360.tech',240,93,{width:310,align:'right'}).text('+965 9957 0836',240,108,{width:310,align:'right'});
  doc.font('Helvetica-Bold').fontSize(18).text(text('heading'),44,140);
  doc.font('Helvetica').fontSize(11).text(`${text('number')}: ${subscription.invoice_number}`,44,170)
    .text(`${text('date')}: ${date(subscription.paid_at)}`,44,188);
  let y=222;
  for(const [label,value] of [['parent',parent.name],['civilId',maskCivilId(parent.civilId)],['child',subscription.student_name],['school',subscription.school],['class',subscription.class]]){
    const line=`${text(label)}: ${value}`;
    doc.text(line,44,y,{width:507}); y+=doc.heightOfString(line,{width:507})+8;
  }
  y+=16;
  const cols=[44,265,350,445], widths=[210,75,85,106];
  doc.rect(44,y,507,28).fill('#0B1526');
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(10);
  ['month','mealDays','rate','amount'].forEach((label,i)=>doc.text(text(label),cols[i]+6,y+9,{width:widths[i]-12,align:i?'right':'left'}));
  y+=36;doc.fillColor('#0B1526').font('Helvetica');
  subscription.months.forEach(m=>{
    const month=new Date(m.month+'-01T00:00:00Z').toLocaleDateString('en-GB',{month:'long',year:'numeric',timeZone:'UTC'});
    [month,String(m.meal_days),Number(m.rate_kwd).toFixed(3),Number(m.amount_kwd).toFixed(3)].forEach((value,i)=>doc.text(value,cols[i]+6,y,{width:widths[i]-12,align:i?'right':'left'}));
    y+=28;
  });
  doc.moveTo(44,y).lineTo(551,y).strokeColor('#B8C7C2').stroke();y+=18;
  doc.font('Helvetica-Bold').fontSize(14).text(`${text('total')}: ${money(subscription.total_kwd)}`,44,y,{width:507,align:'right'});
  y+=42;doc.font('Helvetica').fontSize(10).text(text('payment'),44,y,{width:507});
  return doc;
}
module.exports = { invoiceDocument };

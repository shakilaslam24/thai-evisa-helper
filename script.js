const passportInput = document.getElementById('passportInput');
const ticketInput = document.getElementById('ticketInput');
const hotelInput = document.getElementById('hotelInput');

const processBtn = document.getElementById('processBtn');

const passportOcr = document.getElementById('passportOcr');
const ticketOcr = document.getElementById('ticketOcr');
const hotelOcr = document.getElementById('hotelOcr');

const givenName = document.getElementById('givenName');
const surname = document.getElementById('surname');
const passportNumber = document.getElementById('passportNumber');
const dob = document.getElementById('dob');
const passportExpiry = document.getElementById('passportExpiry');

async function ocrFile(file) {
  if (!file) return "";

  const image = await file.arrayBuffer();
  const blob = new Blob([image]);
  const url = URL.createObjectURL(blob);

  const result = await Tesseract.recognize(url, 'eng');
  URL.revokeObjectURL(url);

  return result.data.text;
}

function parsePassport(text) {
  const data = {};

  const lines = text.split("\n");
  const mrzLines = lines.filter(l => l.includes("<<<<") || l.includes("<<"));

  if (mrzLines.length >= 2) {
    const line1 = mrzLines[0].replace(/\s/g, '');
    const line2 = mrzLines[1].replace(/\s/g, '');

    const afterCountry = line1.substring(5);
    const parts = afterCountry.split("<<");

    data.surname = parts[0]?.replace(/</g, " ");
    data.given = parts[1]?.replace(/</g, " ");

    data.passportNumber = line2.substring(0, 9).replace(/</g, '');
    
    const dobRaw = line2.substring(13, 19);
    data.dob = `${dobRaw.substring(4,6)}-${dobRaw.substring(2,4)}-20${dobRaw.substring(0,2)}`;

    const expRaw = line2.substring(21, 27);
    data.exp = `${expRaw.substring(4,6)}-${expRaw.substring(2,4)}-20${expRaw.substring(0,2)}`;
  }

  return data;
}

processBtn.addEventListener('click', async () => {
  if (passportInput.files[0]) {
    const text = await ocrFile(passportInput.files[0]);
    passportOcr.value = text;

    const info = parsePassport(text);

    givenName.value = info.given || "";
    surname.value = info.surname || "";
    passportNumber.value = info.passportNumber || "";
    dob.value = info.dob || "";
    passportExpiry.value = info.exp || "";
  }

  if (ticketInput.files[0]) {
    ticketOcr.value = await ocrFile(ticketInput.files[0]);
  }

  if (hotelInput.files[0]) {
    hotelOcr.value = await ocrFile(hotelInput.files[0]);
  }
});

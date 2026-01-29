import fetch from 'node-fetch'; // Or native fetch in Node 18+

const data = {
    glpi_ticket_id: "583",
    type: "PREVENTIVO",
    status: "COMPLETADO",
    client_name: "TEST_CLIENT",
    technical_name: "TEST_TECH",
    createdAt: "2024-01-29T13:00:00Z",
    equipment_hostname: "TEST-HOST",
    checklist: {},
    signatures: {},
    photos: []
};

try {
    const response = await fetch('http://localhost:5000/api/sync/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const result = await response.json();
    console.log('Response:', result);
} catch (error) {
    console.error('Error:', error);
}

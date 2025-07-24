export default function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method === 'POST') {
        // Simple message broadcasting via polling
        const { message } = req.body;

        // In a real app, you'd store this in a database or cache
        // For now, just acknowledge receipt
        res.status(200).json({
            success: true,
            timestamp: new Date().toISOString(),
            message: 'Message received'
        });
    } else {
        res.status(200).json({
            status: 'API endpoint working',
            timestamp: new Date().toISOString()
        });
    }
}

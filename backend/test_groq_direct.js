const axios = require('axios');
require('dotenv').config();

async function testGroqDirect() {
    console.log('🧪 Testing Groq API Directly...\n');
    console.log('API Key present:', !!process.env.GROQ_API_KEY);
    console.log('API Key length:', process.env.GROQ_API_KEY?.length || 0);
    console.log('API Key starts with:', process.env.GROQ_API_KEY?.substring(0, 10) || 'N/A');
    
    const prompt = `You are a flight search API. Find round-trip flights from Stuttgart Airport (STR) to Bergamo Airport (BGY). Departure: 2025-01-07, Return: 2025-01-09. Maximum 2 options. Return ONLY valid JSON in this format: {"options": [{"id": "opt1", "price_eur": 184, "is_round_trip": true, "outbound": {"routing": "STR → FRA → BGY", "departure_time": "06:25", "arrival_time": "10:55", "duration_minutes": 270, "stops": 1, "segments": [{"airline": "LH", "flight_number": "LH1155", "from": "STR", "to": "FRA", "departure_time": "06:25", "arrival_time": "08:00", "duration_minutes": 95}]}, "return": {"routing": "BGY → FRA → STR", "departure_time": "12:30", "arrival_time": "17:05", "duration_minutes": 275, "stops": 1, "segments": [{"airline": "AZ", "flight_number": "AZ620", "from": "BGY", "to": "FRA", "departure_time": "12:30", "arrival_time": "14:55", "duration_minutes": 145}]}, "provider": "groq_estimated"}]}`;
    
    try {
        console.log('\n📞 Calling Groq API...');
        const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: 'You are a flight search API. Return only valid JSON. No explanations.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 2000,
            response_format: { type: 'json_object' }
        }, {
            headers: {
                'Authorization': 'Bearer ' + process.env.GROQ_API_KEY,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
        
        console.log('✅ Groq API Response Received!\n');
        console.log('Response status:', res.status);
        const content = res.data.choices[0].message.content;
        console.log('Content length:', content.length);
        console.log('\n📄 Raw Response (first 500 chars):');
        console.log(content.substring(0, 500));
        
        try {
            const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(cleaned);
            console.log('\n✅ JSON Parsed Successfully!');
            console.log('Options found:', parsed.options?.length || 0);
            if (parsed.options?.[0]) {
                console.log('\n📋 First Option:');
                console.log('  Price:', parsed.options[0].price_eur);
                console.log('  Outbound:', parsed.options[0].outbound?.routing);
                console.log('  Segments:', parsed.options[0].outbound?.segments?.length);
                console.log('\n🔍 Full First Option:');
                console.log(JSON.stringify(parsed.options[0], null, 2));
            }
        } catch (e) {
            console.error('\n❌ JSON Parse Error:', e.message);
            console.error('Trying to parse cleaned content...');
        }
    } catch (err) {
        console.error('\n❌ Groq API Error:', err.message);
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Data:', JSON.stringify(err.response.data, null, 2));
        } else if (err.request) {
            console.error('No response received');
        }
    }
}

testGroqDirect();


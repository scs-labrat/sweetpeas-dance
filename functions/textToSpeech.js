import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const body = await req.json();
        const { text } = body;

        if (!text) {
            return new Response(JSON.stringify({ error: 'Text is required' }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
        
        if (!ELEVENLABS_API_KEY) {
            return new Response(JSON.stringify({ error: 'ElevenLabs API key not configured' }), { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Using Fiona's selected voice
        const voiceId = "sgk995upfe3tYLvoGcBN";

        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': ELEVENLABS_API_KEY
                },
                body: JSON.stringify({
                    text: text,
                    model_id: 'eleven_monolingual_v1',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75
                    }
                })
            }
        );

        if (!response.ok) {
            const error = await response.text();
            console.error('ElevenLabs API error:', error);
            return new Response(JSON.stringify({ error: 'Failed to generate speech', details: error }), { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const audioBuffer = await response.arrayBuffer();

        return new Response(audioBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': audioBuffer.byteLength.toString()
            }
        });

    } catch (error) {
        console.error('Text-to-speech error:', error);
        return new Response(JSON.stringify({ error: error.message, stack: error.stack }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});
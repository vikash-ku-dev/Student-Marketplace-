import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

function getGroqApiKey() {
  if (process.env.GROQ_API_KEY) return process.env.GROQ_API_KEY
  if (process.env.VITE_GROQ_API_KEY) return process.env.VITE_GROQ_API_KEY
  try {
    const aiEnvPath = path.resolve(__dirname, 'ai', '.env')
    if (fs.existsSync(aiEnvPath)) {
      const content = fs.readFileSync(aiEnvPath, 'utf-8')
      const match = content.match(/GROQ_API_KEY=(.*)/)
      if (match && match[1]) return match[1].trim().replace(/['"]/g, '')
    }
  } catch {}
  return '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'
}

function campusDudeAiPlugin() {
  return {
    name: 'campusdude-ai-server',
    configureServer(server) {
      server.middlewares.use('/api/chat', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', async () => {
          res.setHeader('Content-Type', 'application/json')
          try {
            const data = JSON.parse(body || '{}')
            const question = (data.question || '').trim()
            const profile = data.profile || {}
            const history = data.history || []

            if (!question) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Question is required' }))
              return
            }

            const apiKey = getGroqApiKey()
            const studentName = profile.name || 'Student'
            const branch = profile.branch || 'Engineering'
            const year = profile.year || 'Student'
            const residence = profile.residence || 'Hosteller'

            const systemPrompt = `You are Dude, the friendly and intelligent AI campus assistant for Guru Nanak Dev Engineering College (GNDEC), Ludhiana (https://www.gndec.ac.in/).
Student details:
- Name: ${studentName}
- Branch: ${branch}
- Year: ${year}
- Residence: ${residence}

Guidelines:
1. When asked about college rules (hostel curfew, 75% attendance policy, leave rules, library book limits, exam passing criteria, grading):
   - Answer accurately according to GNDEC official policies.
2. When asked to draft emails or applications (leave application, fee receipt, gate pass, bonafide):
   - Draft a complete, polite application with Subject and placeholders like [Roll No] or [Date].
3. For greetings, casual questions, or chit-chat:
   - Chat naturally, politely, and warmly as a helpful campus buddy.
4. If the student types random gibberish or characters (e.g. "jkdssbdb"):
   - Politely tell them you didn't quite catch that, and invite them to ask about college rules, exams, hostel, or application drafts.
5. Keep responses concise, clear, and student-friendly with markdown bold headers and bullet points.`

            const messages = [{ role: 'system', content: systemPrompt }]

            if (Array.isArray(history)) {
              history.slice(-4).forEach(h => {
                if (typeof h === 'string') {
                  const isDude = h.startsWith('Dude:')
                  messages.push({
                    role: isDude ? 'assistant' : 'user',
                    content: h.replace(/^(Dude|Student):\s*/, '')
                  })
                }
              })
            }

            messages.push({ role: 'user', content: question })

            let aiAnswer = null
            const models = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b']
            for (const model of models) {
              try {
                const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    model,
                    messages,
                    temperature: 0.5,
                    max_tokens: 1024
                  })
                })

                if (groqRes.ok) {
                  const groqData = await groqRes.json()
                  aiAnswer = groqData?.choices?.[0]?.message?.content
                  if (aiAnswer) break
                } else {
                  console.error(`Groq error ${model} (status ${groqRes.status}):`, await groqRes.text())
                }
              } catch (e) {
                console.error(`Groq request error with ${model}:`, e)
              }
            }

            if (!aiAnswer) {
              aiAnswer = `Hello ${studentName}! I am Dude, your GNDEC campus assistant. I received your query: "${question}". How can I guide you with college rules, hostel timings, exams, or drafting an application?`
            }

            res.statusCode = 200
            res.end(JSON.stringify({
              answer: aiAnswer,
              sources: ['https://www.gndec.ac.in/'],
              intent: 'knowledge'
            }))
          } catch (err) {
            console.error('API chat handler error:', err)
            res.statusCode = 500
            res.end(JSON.stringify({
              answer: 'I encountered a brief glitch processing your request. Please try asking again!',
              sources: ['https://www.gndec.ac.in/'],
              intent: 'knowledge'
            }))
          }
        })
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), campusDudeAiPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5500,
    strictPort: true
  }
})

VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqY3d3b2Nwa3BtaHRkdGxzaXVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MTk3MzYsImV4cCI6MjA4NjE5NTczNn0.Y_BJolhFKLVUy0xyD2-QtkO8rfGLPx3nM9yqEmX2Eig"

VITE_SUPABASE_URL="https://tjcwwocpkpmhtdtlsiuc.supabase.co"


service_role : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqY3d3b2Nwa3BtaHRkdGxzaXVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYxOTczNiwiZXhwIjoyMDg2MTk1NzM2fQ.Yv7Q0pcs5tx-JBWcsPzIemj_RoYj1MF87ca_DbqKmMY

### Data fetch order (always)

1. **Fetch from other subsystem (citizen Supabase) first**
2. **If external fetch fails or returns nothing** → proceed to fetch from own BPM database

Tables in the api:
certificate_requests
feedback
notifications
profiles
survey_answers
survey_questions
survey_responses
surveys
user_roles
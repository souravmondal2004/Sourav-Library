========================================================================
📚 SOURAV'S LIBRARY - LOCAL BOOKS FOLDER
========================================================================

How to publish books from your local computer directly to your live website:

1. Drop any PDF file into this folder (local-books/).
   Example:
   - "Machine-Learning-Handbook.pdf"
   - "Dr. Smith - Quantum Mechanics.pdf"

2. Double-click "sync-github.bat" or run:
   git add -A
   git commit -m "feat: add new books"
   git push origin main

3. What happens automatically:
   - Your PDFs are bundled into the project.
   - Pushed to GitHub.
   - Render automatically deploys them.
   - The backend reads every PDF, extracts its title, counts pages,
     stores it into the catalog, and publishes it on your live website!

Even if Render restarts, sleeps, or uses an ephemeral database,
all books in this folder will ALWAYS be present and readable on your live site!
========================================================================

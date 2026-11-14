# Publish with VS Code, GitHub, and Vercel

The app is a static website. Its terrain and Horizons data files are included, so it needs no server, secrets, or API key after deployment.

## Push the folder to GitHub from VS Code

1. In VS Code, open the `lunar-landing-site-navigator` folder.
2. Select the **Source Control** icon on the left.
3. Choose **Initialize Repository**.
4. Stage the project files, enter a message such as `Build Astro lunar site navigator`, and select **Commit**.
5. Choose **Publish to GitHub** and sign in if VS Code asks. Create a repository for this project.

The project contains public scientific data and code, no passwords or API keys. Choose public if you want judges to open the source link.

## Deploy that GitHub repository to Vercel

1. Sign in to Vercel and choose **Add New → Project**.
2. Import the GitHub repository you just published.
3. Choose **Other** for Framework Preset.
4. Leave the Build Command blank. Leave Output Directory at `.` (the repository root).
5. Select **Deploy**. When it finishes, open the Vercel URL and make sure the charts and timelines appear.

Vercel documents that static HTML/CSS/JavaScript sites need no build step; with the **Other** preset, it serves the project root when no `public` folder exists. [Vercel build settings](https://vercel.com/docs/builds), [Vercel build configuration](https://vercel.com/docs/builds/configure-a-build).

## Add the links to Space Apps

Copy the Vercel URL as the project website link and the GitHub repository URL as the source link. Copy the project description and data/method notes from `SUBMISSION-PACKAGE.md` into the team’s Space Apps Project page, then submit it before the event deadline.

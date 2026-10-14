# AI-Assisted Chemical Formulation & Laboratory Decision Support

A polished, clickable prototype for petroleum chemists and laboratory teams to organize historical experimental data, compare formulations, inspect simulated analytical patterns, plan follow-up experiments, and produce illustrative reports.

## Included workflows

- Oilfield demulsifier bottle-test analysis
- Gasoline blend and octane-booster screening
- CSV and `.xlsx` historical-data import with preview, mapping, validation, and simulated import results
- Experiment entry, editing, duplication, comparison, filtering, and related-record review
- Simulated AI-assisted insights and evidence-linked next-test recommendations
- Experimental testing plan with status transitions and manual result entry
- Report preview and PDF download
- Mock administration for users, roles, formulations, templates, fields, and datasets

All laboratory data, insights, expected results, and recommendations are illustrative. This prototype does not include a backend, database, trained AI model, authentication system, laboratory integration, or scientifically validated predictions.

## Local development

Requirements: Node.js and Corepack.

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

Open `http://localhost:3000`.

## Production build

```bash
corepack pnpm build
corepack pnpm start
```

## Deploying to Vercel

Import this GitHub repository into Vercel. Vercel will automatically detect Next.js and use the locked pnpm version declared in `package.json`. No environment variables or custom build configuration are required for this prototype.

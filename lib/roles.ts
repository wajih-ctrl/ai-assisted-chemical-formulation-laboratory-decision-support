import type { RoleId } from './types'

export interface RoleDef {
  id: RoleId
  label: string
  tagline: string
  description: string
  focus: string[]
}

export const ROLES: RoleDef[] = [
  {
    id: 'chemist',
    label: 'Formulation Chemist',
    tagline: 'Review, compare, decide',
    description: 'Reviews historical experiments, compares formulations, decides on next tests and prepares reports.',
    focus: ['Analysis', 'Recommendations', 'Reports'],
  },
  {
    id: 'technician',
    label: 'Laboratory Technician',
    tagline: 'Collect and record',
    description: 'Executes assigned tests, records conditions and measurements, and updates observations.',
    focus: ['Assigned tests', 'Result entry'],
  },
  {
    id: 'lab-manager',
    label: 'Laboratory Manager',
    tagline: 'Operations and capacity',
    description: 'Oversees laboratory status, assigns technicians and reviews completed and pending work.',
    focus: ['Testing plan', 'Workload'],
  },
  {
    id: 'rd-manager',
    label: 'R&D Manager',
    tagline: 'Coverage and opportunity',
    description: 'Reviews performance trends, experimental coverage and research opportunities across formulations.',
    focus: ['Trends', 'Coverage gaps'],
  },
  {
    id: 'tech-manager',
    label: 'Technical Manager',
    tagline: 'Applicability and validation',
    description: 'Examines test conditions, operational implications and validation requirements.',
    focus: ['Conditions', 'Validation'],
  },
  {
    id: 'admin',
    label: 'Administrator',
    tagline: 'Configuration',
    description: 'Manages mock users, chemical categories, formulations, templates and demo datasets.',
    focus: ['Users', 'Chemicals', 'Datasets'],
  },
]

export const ROLE_LABEL: Record<RoleId, string> = Object.fromEntries(
  ROLES.map((r) => [r.id, r.label]),
) as Record<RoleId, string>

export type Capability =
  | 'experiment:add'
  | 'experiment:edit'
  | 'data:import'
  | 'recommendation:decide'
  | 'plan:create'
  | 'plan:assign'
  | 'plan:approve'
  | 'plan:schedule'
  | 'plan:execute'
  | 'plan:cancel'
  | 'report:generate'
  | 'admin:manage'

const MATRIX: Record<RoleId, Capability[]> = {
  chemist: [
    'experiment:add', 'experiment:edit', 'data:import', 'recommendation:decide', 'plan:create',
    'plan:assign', 'plan:approve', 'plan:schedule', 'plan:execute', 'plan:cancel', 'report:generate',
  ],
  technician: ['experiment:add', 'experiment:edit', 'plan:execute'],
  'lab-manager': ['plan:assign', 'plan:schedule', 'plan:cancel', 'report:generate'],
  'rd-manager': ['report:generate'],
  'tech-manager': ['report:generate'],
  admin: ['data:import', 'report:generate', 'admin:manage'],
}

export function can(role: RoleId, cap: Capability): boolean {
  return MATRIX[role].includes(cap)
}

export const CAPABILITY_HINT: Record<Capability, string> = {
  'experiment:add': 'Formulation Chemist or Laboratory Technician',
  'experiment:edit': 'Formulation Chemist or Laboratory Technician',
  'data:import': 'Formulation Chemist or Administrator',
  'recommendation:decide': 'Formulation Chemist',
  'plan:create': 'Formulation Chemist',
  'plan:assign': 'Formulation Chemist or Laboratory Manager',
  'plan:approve': 'Formulation Chemist',
  'plan:schedule': 'Formulation Chemist or Laboratory Manager',
  'plan:execute': 'Formulation Chemist or the assigned Technician',
  'plan:cancel': 'Formulation Chemist or Laboratory Manager',
  'report:generate': 'any role except Laboratory Technician',
  'admin:manage': 'Administrator',
}

export interface NavItem {
  href: string
  label: string
  icon: string
  roles: RoleId[]
}
export interface NavGroup {
  label: string
  items: NavItem[]
}

const ALL: RoleId[] = ['chemist', 'technician', 'lab-manager', 'rd-manager', 'tech-manager', 'admin']
const NON_ADMIN: RoleId[] = ['chemist', 'technician', 'lab-manager', 'rd-manager', 'tech-manager']
const ANALYTIC: RoleId[] = ['chemist', 'lab-manager', 'rd-manager', 'tech-manager']

export const NAV: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: 'layout', roles: ALL },
      { href: '/workflows', label: 'Chemical Workflows', icon: 'flask', roles: ALL },
    ],
  },
  {
    label: 'Laboratory',
    items: [
      { href: '/experiments', label: 'Experiments', icon: 'test-tubes', roles: ALL },
      { href: '/data/upload', label: 'Import Historical Data', icon: 'upload', roles: ['chemist', 'admin'] },
      { href: '/experiments/new', label: 'Add Experiment', icon: 'plus', roles: ['chemist', 'technician'] },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { href: '/analysis/demulsifier', label: 'Bottle-Test Analysis', icon: 'chart', roles: NON_ADMIN },
      { href: '/comparison', label: 'Formulation Comparison', icon: 'columns', roles: ANALYTIC },
      { href: '/analytics', label: 'Performance Analytics', icon: 'activity', roles: [...ANALYTIC, 'admin'] },
      { href: '/insights', label: 'AI Insights', icon: 'lens', roles: ANALYTIC },
    ],
  },
  {
    label: 'Planning',
    items: [
      { href: '/recommendations', label: 'Next-Test Recommendations', icon: 'route', roles: ANALYTIC },
      { href: '/testing-plan', label: 'Testing Plan', icon: 'clipboard', roles: NON_ADMIN },
    ],
  },
  {
    label: 'Specialized Workflows',
    items: [{ href: '/analysis/gasoline', label: 'Gasoline Blending', icon: 'fuel', roles: NON_ADMIN }],
  },
  {
    label: 'Reporting',
    items: [{ href: '/reports', label: 'Reports', icon: 'file', roles: [...ANALYTIC, 'admin'] }],
  },
  {
    label: 'Administration',
    items: [
      { href: '/admin', label: 'Admin Dashboard', icon: 'shield', roles: ['admin'] },
      { href: '/admin/chemicals', label: 'Chemical Management', icon: 'beaker', roles: ['admin'] },
      { href: '/admin/users', label: 'User Management', icon: 'users', roles: ['admin'] },
    ],
  },
]

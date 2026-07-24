// BC curriculum catalogue — the standards teachers attach to coursework.
//
// Structure mirrors British Columbia's redesigned (2016+) curriculum:
//   • Big Ideas             — the "Understand": generalizations central to the subject
//   • Curricular Competencies — the "Do": skills, processes, habits of mind (grouped by strand)
//   • Content               — the "Know": the knowledge students engage with
//   • Core Competencies     — cross-curricular (Communication / Thinking / Personal & Social)
//
// Assessment uses the BC provincial proficiency scale rather than percentages.
//
// NOTE: this is a representative subset transcribed for the sandbox, covering the
// two seeded courses (Science 9, Mathematics 9) plus the K-12 Core Competencies.
// Before real use, verify against the official source at curriculum.gov.bc.ca —
// the full catalogue spans every grade and area of learning.

export type StandardKind = 'big-idea' | 'curricular-competency' | 'content' | 'core-competency'

export interface BcStandard {
  id: string
  /** Area of Learning, e.g. 'Science'. 'Core' for the cross-curricular competencies. */
  subject: string
  /** Grade level, or 'K-12' for Core Competencies. */
  grade: string
  kind: StandardKind
  /** Short display code, e.g. 'SCI9-BI-1'. */
  code: string
  text: string
  /** Organizing strand (curricular competencies / core competencies). */
  strand?: string
}

/** The BC provincial proficiency scale, ordered least → most proficient. */
export type ProficiencyLevel = 'emerging' | 'developing' | 'proficient' | 'extending'

export const PROFICIENCY_LEVELS: ProficiencyLevel[] = ['emerging', 'developing', 'proficient', 'extending']

export const PROFICIENCY_META: Record<
  ProficiencyLevel,
  { label: string; short: string; description: string; color: string; bg: string }
> = {
  emerging: {
    label: 'Emerging',
    short: 'EM',
    description: 'Initial understanding — beginning to demonstrate the learning.',
    color: '#b45309',
    bg: '#fdf3e3',
  },
  developing: {
    label: 'Developing',
    short: 'DE',
    description: 'Partial understanding — demonstrates the learning with some support.',
    color: '#1e40af',
    bg: '#e7edff',
  },
  proficient: {
    label: 'Proficient',
    short: 'PR',
    description: 'Complete understanding — consistently demonstrates the expected learning.',
    color: '#0f7a4d',
    bg: '#e7f6ee',
  },
  extending: {
    label: 'Extending',
    short: 'EX',
    description: 'Sophisticated understanding — demonstrates the learning with depth beyond expectations.',
    color: '#6d28d9',
    bg: '#f0e9ff',
  },
}

// ---------------------------------------------------------------------------
// Core Competencies (K-12, cross-curricular)
// ---------------------------------------------------------------------------

const CORE: BcStandard[] = [
  { id: 'core-com-1', subject: 'Core', grade: 'K-12', kind: 'core-competency', strand: 'Communication', code: 'CC-COM-1', text: 'Communicating — I connect and engage with others to share and develop ideas.' },
  { id: 'core-com-2', subject: 'Core', grade: 'K-12', kind: 'core-competency', strand: 'Communication', code: 'CC-COM-2', text: 'Collaborating — I work with others to achieve a common goal.' },
  { id: 'core-think-1', subject: 'Core', grade: 'K-12', kind: 'core-competency', strand: 'Thinking', code: 'CC-THK-1', text: 'Creative Thinking — I generate and develop novel ideas.' },
  { id: 'core-think-2', subject: 'Core', grade: 'K-12', kind: 'core-competency', strand: 'Thinking', code: 'CC-THK-2', text: 'Critical and Reflective Thinking — I analyze and critique, question and investigate.' },
  { id: 'core-ps-1', subject: 'Core', grade: 'K-12', kind: 'core-competency', strand: 'Personal & Social', code: 'CC-PS-1', text: 'Personal Awareness and Responsibility — I take responsibility for my own learning and well-being.' },
  { id: 'core-ps-2', subject: 'Core', grade: 'K-12', kind: 'core-competency', strand: 'Personal & Social', code: 'CC-PS-2', text: 'Social Awareness and Responsibility — I contribute to community and care for the environment.' },
  { id: 'core-ps-3', subject: 'Core', grade: 'K-12', kind: 'core-competency', strand: 'Personal & Social', code: 'CC-PS-3', text: 'Positive Personal and Cultural Identity — I understand the values and beliefs that shape who I am.' },
]

// ---------------------------------------------------------------------------
// Science 9
// ---------------------------------------------------------------------------

const SCIENCE_9: BcStandard[] = [
  // Big Ideas
  { id: 'sci9-bi-1', subject: 'Science', grade: '9', kind: 'big-idea', code: 'SCI9-BI-1', text: 'Cells are derived from cells.' },
  { id: 'sci9-bi-2', subject: 'Science', grade: '9', kind: 'big-idea', code: 'SCI9-BI-2', text: 'The electron arrangement of atoms impacts their chemical nature.' },
  { id: 'sci9-bi-3', subject: 'Science', grade: '9', kind: 'big-idea', code: 'SCI9-BI-3', text: 'Electricity is the flow of electrons.' },
  { id: 'sci9-bi-4', subject: 'Science', grade: '9', kind: 'big-idea', code: 'SCI9-BI-4', text: 'The biosphere, geosphere, hydrosphere, and atmosphere are interconnected, as matter cycles and energy flows through them.' },

  // Curricular Competencies
  { id: 'sci9-cc-1', subject: 'Science', grade: '9', kind: 'curricular-competency', strand: 'Questioning and predicting', code: 'SCI9-CC-1', text: 'Demonstrate a sustained curiosity about a scientific topic or problem of personal interest.' },
  { id: 'sci9-cc-2', subject: 'Science', grade: '9', kind: 'curricular-competency', strand: 'Questioning and predicting', code: 'SCI9-CC-2', text: 'Formulate multiple hypotheses and predict multiple outcomes.' },
  { id: 'sci9-cc-3', subject: 'Science', grade: '9', kind: 'curricular-competency', strand: 'Planning and conducting', code: 'SCI9-CC-3', text: 'Collaboratively and individually plan, select, and use appropriate investigation methods, including field work and lab experiments, to collect reliable data.' },
  { id: 'sci9-cc-4', subject: 'Science', grade: '9', kind: 'curricular-competency', strand: 'Planning and conducting', code: 'SCI9-CC-4', text: 'Use appropriate SI units and appropriate equipment to systematically and accurately collect and record data.' },
  { id: 'sci9-cc-5', subject: 'Science', grade: '9', kind: 'curricular-competency', strand: 'Processing and analyzing', code: 'SCI9-CC-5', text: 'Seek and analyze patterns, trends, and connections in data, including describing relationships between variables and identifying inconsistencies.' },
  { id: 'sci9-cc-6', subject: 'Science', grade: '9', kind: 'curricular-competency', strand: 'Processing and analyzing', code: 'SCI9-CC-6', text: 'Construct, analyze, and interpret graphs, models, and/or diagrams.' },
  { id: 'sci9-cc-7', subject: 'Science', grade: '9', kind: 'curricular-competency', strand: 'Processing and analyzing', code: 'SCI9-CC-7', text: 'Use knowledge of scientific concepts to draw conclusions that are consistent with evidence.' },
  { id: 'sci9-cc-8', subject: 'Science', grade: '9', kind: 'curricular-competency', strand: 'Evaluating', code: 'SCI9-CC-8', text: 'Evaluate their methods and experimental conditions, including identifying sources of error or uncertainty and confounding variables.' },
  { id: 'sci9-cc-9', subject: 'Science', grade: '9', kind: 'curricular-competency', strand: 'Evaluating', code: 'SCI9-CC-9', text: 'Demonstrate an awareness of assumptions, question information given, and identify bias in their own work and in primary and secondary sources.' },
  { id: 'sci9-cc-10', subject: 'Science', grade: '9', kind: 'curricular-competency', strand: 'Applying and innovating', code: 'SCI9-CC-10', text: 'Contribute to care for self, others, community, and world through individual or collaborative approaches.' },
  { id: 'sci9-cc-11', subject: 'Science', grade: '9', kind: 'curricular-competency', strand: 'Communicating', code: 'SCI9-CC-11', text: 'Communicate scientific ideas, claims, and information for a specific purpose and audience, constructing evidence-based arguments and using appropriate scientific language, conventions, and representations.' },

  // Content
  { id: 'sci9-co-1', subject: 'Science', grade: '9', kind: 'content', code: 'SCI9-CO-1', text: 'Cell processes and diversity: photosynthesis and cellular respiration.' },
  { id: 'sci9-co-2', subject: 'Science', grade: '9', kind: 'content', code: 'SCI9-CO-2', text: 'Reproduction: asexual and sexual.' },
  { id: 'sci9-co-3', subject: 'Science', grade: '9', kind: 'content', code: 'SCI9-CO-3', text: 'The relationship of micro-organisms with living things.' },
  { id: 'sci9-co-4', subject: 'Science', grade: '9', kind: 'content', code: 'SCI9-CO-4', text: 'Matter cycles within biotic and abiotic components of ecosystems.' },
  { id: 'sci9-co-5', subject: 'Science', grade: '9', kind: 'content', code: 'SCI9-CO-5', text: 'The atomic model and its use in understanding the formation of compounds and chemical bonding.' },
  { id: 'sci9-co-6', subject: 'Science', grade: '9', kind: 'content', code: 'SCI9-CO-6', text: 'The electron and the development of the atomic model.' },
  { id: 'sci9-co-7', subject: 'Science', grade: '9', kind: 'content', code: 'SCI9-CO-7', text: 'Static and current electricity.' },
  { id: 'sci9-co-8', subject: 'Science', grade: '9', kind: 'content', code: 'SCI9-CO-8', text: 'Circuits: Ohm’s law, series and parallel.' },
  { id: 'sci9-co-9', subject: 'Science', grade: '9', kind: 'content', code: 'SCI9-CO-9', text: 'The law of conservation of energy.' },
  { id: 'sci9-co-10', subject: 'Science', grade: '9', kind: 'content', code: 'SCI9-CO-10', text: 'First Peoples knowledge of interconnectedness and sustainable practices.' },
]

// ---------------------------------------------------------------------------
// Mathematics 9
// ---------------------------------------------------------------------------

const MATH_9: BcStandard[] = [
  // Big Ideas
  { id: 'ma9-bi-1', subject: 'Mathematics', grade: '9', kind: 'big-idea', code: 'MA9-BI-1', text: 'The principles and processes underlying operations with numbers apply equally to algebraic situations and can be described and analyzed.' },
  { id: 'ma9-bi-2', subject: 'Mathematics', grade: '9', kind: 'big-idea', code: 'MA9-BI-2', text: 'Computational fluency and flexibility with numbers extend to operations with rational numbers.' },
  { id: 'ma9-bi-3', subject: 'Mathematics', grade: '9', kind: 'big-idea', code: 'MA9-BI-3', text: 'Continuous linear relationships can be identified and represented in many connected ways to identify regularities and make generalizations.' },
  { id: 'ma9-bi-4', subject: 'Mathematics', grade: '9', kind: 'big-idea', code: 'MA9-BI-4', text: 'Similar shapes have proportional relationships that can be described, measured, and compared.' },
  { id: 'ma9-bi-5', subject: 'Mathematics', grade: '9', kind: 'big-idea', code: 'MA9-BI-5', text: 'Analyzing the validity, reliability, and representation of data enables us to compare and interpret.' },

  // Curricular Competencies
  { id: 'ma9-cc-1', subject: 'Mathematics', grade: '9', kind: 'curricular-competency', strand: 'Reasoning and analyzing', code: 'MA9-CC-1', text: 'Use reasoning and logic to explore, analyze, and apply mathematical ideas.' },
  { id: 'ma9-cc-2', subject: 'Mathematics', grade: '9', kind: 'curricular-competency', strand: 'Reasoning and analyzing', code: 'MA9-CC-2', text: 'Estimate reasonably and demonstrate and apply mental math strategies.' },
  { id: 'ma9-cc-3', subject: 'Mathematics', grade: '9', kind: 'curricular-competency', strand: 'Reasoning and analyzing', code: 'MA9-CC-3', text: 'Model mathematics in contextualized experiences.' },
  { id: 'ma9-cc-4', subject: 'Mathematics', grade: '9', kind: 'curricular-competency', strand: 'Understanding and solving', code: 'MA9-CC-4', text: 'Apply multiple strategies to solve problems in both abstract and contextualized situations.' },
  { id: 'ma9-cc-5', subject: 'Mathematics', grade: '9', kind: 'curricular-competency', strand: 'Understanding and solving', code: 'MA9-CC-5', text: 'Develop, demonstrate, and apply mathematical understanding through play, inquiry, and problem solving.' },
  { id: 'ma9-cc-6', subject: 'Mathematics', grade: '9', kind: 'curricular-competency', strand: 'Communicating and representing', code: 'MA9-CC-6', text: 'Explain and justify mathematical ideas and decisions.' },
  { id: 'ma9-cc-7', subject: 'Mathematics', grade: '9', kind: 'curricular-competency', strand: 'Communicating and representing', code: 'MA9-CC-7', text: 'Represent mathematical ideas in concrete, pictorial, and symbolic forms.' },
  { id: 'ma9-cc-8', subject: 'Mathematics', grade: '9', kind: 'curricular-competency', strand: 'Connecting and reflecting', code: 'MA9-CC-8', text: 'Connect mathematical concepts to each other and to other areas and personal interests.' },
  { id: 'ma9-cc-9', subject: 'Mathematics', grade: '9', kind: 'curricular-competency', strand: 'Connecting and reflecting', code: 'MA9-CC-9', text: 'Incorporate First Peoples worldviews and perspectives to make connections to mathematical concepts.' },

  // Content
  { id: 'ma9-co-1', subject: 'Mathematics', grade: '9', kind: 'content', code: 'MA9-CO-1', text: 'Operations with rational numbers (addition, subtraction, multiplication, division, order of operations).' },
  { id: 'ma9-co-2', subject: 'Mathematics', grade: '9', kind: 'content', code: 'MA9-CO-2', text: 'Exponents and exponent laws with whole-number exponents.' },
  { id: 'ma9-co-3', subject: 'Mathematics', grade: '9', kind: 'content', code: 'MA9-CO-3', text: 'Operations with polynomials of degree less than or equal to 2.' },
  { id: 'ma9-co-4', subject: 'Mathematics', grade: '9', kind: 'content', code: 'MA9-CO-4', text: 'Two-variable linear relations, using graphing, interpolation, and extrapolation.' },
  { id: 'ma9-co-5', subject: 'Mathematics', grade: '9', kind: 'content', code: 'MA9-CO-5', text: 'Multi-step one-variable linear equations.' },
  { id: 'ma9-co-6', subject: 'Mathematics', grade: '9', kind: 'content', code: 'MA9-CO-6', text: 'Spatial proportional reasoning.' },
  { id: 'ma9-co-7', subject: 'Mathematics', grade: '9', kind: 'content', code: 'MA9-CO-7', text: 'Statistics in society.' },
  { id: 'ma9-co-8', subject: 'Mathematics', grade: '9', kind: 'content', code: 'MA9-CO-8', text: 'Financial literacy — simple budgets and transactions.' },
]

export const BC_STANDARDS: BcStandard[] = [...SCIENCE_9, ...MATH_9, ...CORE]

export const KIND_META: Record<StandardKind, { label: string; plural: string; icon: string }> = {
  'big-idea': { label: 'Big Idea', plural: 'Big Ideas', icon: '◆' },
  'curricular-competency': { label: 'Curricular Competency', plural: 'Curricular Competencies', icon: '▲' },
  content: { label: 'Content', plural: 'Content', icon: '■' },
  'core-competency': { label: 'Core Competency', plural: 'Core Competencies', icon: '★' },
}

export function getStandard(id: string): BcStandard | undefined {
  return BC_STANDARDS.find((s) => s.id === id)
}

/** Standards available to a course: its own subject+grade, plus Core Competencies. */
export function standardsFor(subject: string | undefined, grade: string | undefined): BcStandard[] {
  if (!subject || !grade) return BC_STANDARDS.filter((s) => s.kind === 'core-competency')
  return BC_STANDARDS.filter(
    (s) => (s.subject === subject && s.grade === grade) || s.kind === 'core-competency',
  )
}

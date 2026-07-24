// BC curriculum — Graduation Program (Grades 10–12).
//
// Structured exactly as Grade 9: Big Ideas / Curricular Competencies (by
// strand) / Content. Senior courses are named subjects (Chemistry 11,
// Pre-calculus 12) rather than "Science 11", matching how BC actually defines
// the Graduation Program.
//
// REPORTING NOTE: under BC's K-12 reporting policy, Grades 10–12 report letter
// grades and percentages; the proficiency scale is used formatively. Grades K–9
// report on the proficiency scale only.
//
// As with the Grade 9 set, this is a representative transcription for the
// sandbox — use the Standards Import to load the official catalogue from
// curriculum.gov.bc.ca.

import type { BcStandard, StandardKind } from './bc-curriculum'

type Row = [kind: StandardKind, code: string, text: string, strand?: string]

/** Compact builder: expands rows into full BcStandard records. */
function build(subject: string, grade: string, prefix: string, rows: Row[]): BcStandard[] {
  return rows.map(([kind, code, text, strand]) => ({
    id: `${prefix}-${code}`.toLowerCase(),
    subject,
    grade,
    kind,
    code: `${prefix}-${code}`,
    text,
    strand,
  }))
}

// The six science curricular-competency strands are shared across senior
// sciences, so define them once and reuse per course.
const SCIENCE_COMPETENCIES: Row[] = [
  ['curricular-competency', 'CC1', 'Demonstrate a sustained intellectual curiosity about a scientific topic or problem of personal interest.', 'Questioning and predicting'],
  ['curricular-competency', 'CC2', 'Formulate multiple hypotheses and predict multiple outcomes.', 'Questioning and predicting'],
  ['curricular-competency', 'CC3', 'Collaboratively and individually plan, select, and use appropriate investigation methods to collect reliable data.', 'Planning and conducting'],
  ['curricular-competency', 'CC4', 'Apply the concepts of accuracy, precision, and uncertainty when collecting and recording data.', 'Planning and conducting'],
  ['curricular-competency', 'CC5', 'Seek and analyze patterns, trends, and connections in data, including describing relationships between variables and identifying inconsistencies.', 'Processing and analyzing'],
  ['curricular-competency', 'CC6', 'Construct, analyze, and interpret graphs, models, and/or diagrams.', 'Processing and analyzing'],
  ['curricular-competency', 'CC7', 'Use knowledge of scientific concepts to draw conclusions that are consistent with evidence.', 'Processing and analyzing'],
  ['curricular-competency', 'CC8', 'Evaluate their methods and experimental conditions, including identifying sources of error, and describe specific ways to improve their investigation.', 'Evaluating'],
  ['curricular-competency', 'CC9', 'Demonstrate an awareness of assumptions, question information given, and identify bias in their own work and in primary and secondary sources.', 'Evaluating'],
  ['curricular-competency', 'CC10', 'Consider social, ethical, and environmental implications of the findings from their own and others’ investigations.', 'Applying and innovating'],
  ['curricular-competency', 'CC11', 'Communicate scientific ideas and information for a specific purpose and audience, constructing evidence-based arguments and using appropriate scientific language, conventions, and representations.', 'Communicating'],
]

// The four mathematics curricular-competency strands, shared across senior math.
const MATH_COMPETENCIES: Row[] = [
  ['curricular-competency', 'CC1', 'Use reasoning and logic to explore, analyze, and apply mathematical ideas.', 'Reasoning and modelling'],
  ['curricular-competency', 'CC2', 'Estimate reasonably and demonstrate fluent, flexible, and strategic thinking about number.', 'Reasoning and modelling'],
  ['curricular-competency', 'CC3', 'Model with mathematics in situational contexts.', 'Reasoning and modelling'],
  ['curricular-competency', 'CC4', 'Apply flexible and strategic approaches to solve problems.', 'Understanding and solving'],
  ['curricular-competency', 'CC5', 'Visualize to explore and illustrate mathematical concepts and relationships.', 'Understanding and solving'],
  ['curricular-competency', 'CC6', 'Explain and justify mathematical ideas and decisions in many ways.', 'Communicating and representing'],
  ['curricular-competency', 'CC7', 'Represent mathematical ideas in concrete, pictorial, and symbolic forms.', 'Communicating and representing'],
  ['curricular-competency', 'CC8', 'Connect mathematical concepts to each other and to other areas and personal interests.', 'Connecting and reflecting'],
  ['curricular-competency', 'CC9', 'Reflect on mathematical thinking and incorporate First Peoples worldviews and perspectives to make connections.', 'Connecting and reflecting'],
]

// Grade 10–12 English Language Arts share a competency framework.
const ELA_COMPETENCIES: Row[] = [
  ['curricular-competency', 'CC1', 'Read for enjoyment and to achieve personal and academic goals.', 'Comprehend and connect'],
  ['curricular-competency', 'CC2', 'Apply appropriate strategies to comprehend written, oral, visual, and multimodal texts.', 'Comprehend and connect'],
  ['curricular-competency', 'CC3', 'Synthesize ideas from a variety of sources to build understanding.', 'Comprehend and connect'],
  ['curricular-competency', 'CC4', 'Recognize and appreciate how different features, forms, and genres of texts reflect various purposes, audiences, and messages.', 'Comprehend and connect'],
  ['curricular-competency', 'CC5', 'Think critically, creatively, and reflectively to explore ideas within, between, and beyond texts.', 'Comprehend and connect'],
  ['curricular-competency', 'CC6', 'Recognize the influence of personal, social, and cultural contexts, values, and perspectives in texts.', 'Comprehend and connect'],
  ['curricular-competency', 'CC7', 'Respectfully exchange ideas and viewpoints from a variety of perspectives to build shared understanding.', 'Create and communicate'],
  ['curricular-competency', 'CC8', 'Use writing and design processes to plan, develop, and create engaging and meaningful texts for a variety of purposes and audiences.', 'Create and communicate'],
  ['curricular-competency', 'CC9', 'Assess and refine texts to improve clarity, effectiveness, and impact.', 'Create and communicate'],
  ['curricular-competency', 'CC10', 'Use an increasing repertoire of literary and rhetorical devices to achieve desired effects.', 'Create and communicate'],
]

// ---------------------------------------------------------------------------
// Grade 10
// ---------------------------------------------------------------------------

const SCIENCE_10 = build('Science', '10', 'SCI10', [
  ['big-idea', 'BI1', 'Genes are the foundation for the diversity of living things.'],
  ['big-idea', 'BI2', 'Energy is conserved, and its transformation can affect living things and the environment.'],
  ['big-idea', 'BI3', 'Chemical processes require energy change as atoms are rearranged.'],
  ['big-idea', 'BI4', 'The formation of the universe can be explained by the big bang theory.'],
  ...SCIENCE_COMPETENCIES,
  ['content', 'CO1', 'DNA structure and function.'],
  ['content', 'CO2', 'Patterns of inheritance.'],
  ['content', 'CO3', 'Mechanisms for the diversity of life: mutation and natural selection.'],
  ['content', 'CO4', 'Transformation of energy: potential and kinetic, and the law of conservation of energy.'],
  ['content', 'CO5', 'Nuclear energy: fission, fusion, and radioactivity.'],
  ['content', 'CO6', 'Law of conservation of mass.'],
  ['content', 'CO7', 'Chemical reactions: types, balancing equations, and energy change.'],
  ['content', 'CO8', 'The formation of the universe: the big bang theory and its evidence.'],
  ['content', 'CO9', 'Astronomical data and the relationships used to interpret it.'],
])

const FMPC_10 = build('Foundations of Mathematics and Pre-calculus', '10', 'FMPC10', [
  ['big-idea', 'BI1', 'Algebra allows us to generalize relationships through abstract thinking.'],
  ['big-idea', 'BI2', 'The meanings of, and connections between, operations extend to powers, radicals, and polynomials.'],
  ['big-idea', 'BI3', 'Constructing and analyzing graphs of linear relations is a tool for solving problems.'],
  ['big-idea', 'BI4', 'Trigonometry involves using proportional reasoning to solve indirect measurement problems.'],
  ...MATH_COMPETENCIES,
  ['content', 'CO1', 'Operations with powers and the exponent laws, including rational exponents.'],
  ['content', 'CO2', 'Prime factorization, and greatest common factor / least common multiple.'],
  ['content', 'CO3', 'Functions and relations: connecting data, graphs, and situations.'],
  ['content', 'CO4', 'Linear functions: slope, intercepts, and equations in multiple forms.'],
  ['content', 'CO5', 'Arithmetic sequences.'],
  ['content', 'CO6', 'Systems of linear equations.'],
  ['content', 'CO7', 'Multiplication and factoring of polynomial expressions.'],
  ['content', 'CO8', 'Primary trigonometric ratios in right triangles.'],
  ['content', 'CO9', 'Surface area and volume of 3D objects.'],
])

const ENGLISH_10 = build('English Studies', '10', 'EN10', [
  ['big-idea', 'BI1', 'The exploration of text and story deepens our understanding of diverse, complex ideas about identity, others, and the world.'],
  ['big-idea', 'BI2', 'People understand text differently depending on their worldviews and perspectives.'],
  ['big-idea', 'BI3', 'Texts are socially, culturally, geographically, and historically constructed.'],
  ['big-idea', 'BI4', 'Language shapes ideas and influences others.'],
  ['big-idea', 'BI5', 'Voice is powerful and evocative.'],
  ...ELA_COMPETENCIES,
  ['content', 'CO1', 'Text forms and genres, and their features and structures.'],
  ['content', 'CO2', 'Literary elements and devices, and their effects.'],
  ['content', 'CO3', 'First Peoples perspectives, values, and the protocols relating to the ownership of stories.'],
  ['content', 'CO4', 'Elements of style, including syntax, diction, and tone.'],
  ['content', 'CO5', 'Language change, and the influence of context on meaning.'],
  ['content', 'CO6', 'Citation and referencing of sources with academic integrity.'],
])

const SOCIALS_10 = build('Social Studies', '10', 'SS10', [
  ['big-idea', 'BI1', 'Political institutions and ideologies both shape and are shaped by economic and social conditions.'],
  ['big-idea', 'BI2', 'Worldviews lead to different perspectives and ideas about developments in Canadian society.'],
  ['big-idea', 'BI3', 'Historical and contemporary injustices challenge the narrative and identity of Canada as an inclusive, multicultural society.'],
  ['big-idea', 'BI4', 'Canada’s policies and treatment of minority peoples have negative and positive legacies.'],
  ['curricular-competency', 'CC1', 'Use Social Studies inquiry processes and skills to ask questions, gather and interpret information, and communicate findings.', 'Inquiry'],
  ['curricular-competency', 'CC2', 'Assess the significance of people, places, events, or developments.', 'Significance'],
  ['curricular-competency', 'CC3', 'Assess the justification for competing accounts after investigating points of contention and reliability of sources.', 'Evidence'],
  ['curricular-competency', 'CC4', 'Compare and contrast continuities and changes for different groups at different times and places.', 'Continuity and change'],
  ['curricular-competency', 'CC5', 'Assess how underlying conditions and the actions of individuals or groups influence events, decisions, or developments.', 'Cause and consequence'],
  ['curricular-competency', 'CC6', 'Explain and infer different perspectives on past or present people, places, issues, or events.', 'Perspective'],
  ['curricular-competency', 'CC7', 'Make reasoned ethical judgments about actions in the past and present, and assess appropriate ways to respond.', 'Ethical judgment'],
  ['content', 'CO1', 'Historical globalization and imperialism, and their ongoing effects.'],
  ['content', 'CO2', 'The development of Canadian autonomy and national identity.'],
  ['content', 'CO3', 'Discriminatory policies and injustices in Canada and the world, including residential schools and the Indian Act.'],
  ['content', 'CO4', 'Advocacy for human rights, including truth and reconciliation.'],
  ['content', 'CO5', 'Domestic and international conflict and co-operation.'],
  ['content', 'CO6', 'Political and economic ideologies and their policies.'],
  ['content', 'CO7', 'Environmental, political, and economic policies and their impacts.'],
])

const CLE_1012 = build('Career-Life Education', '10-12', 'CLE', [
  ['big-idea', 'BI1', 'Career-life development includes ongoing cycles of exploring, planning, reflecting, adapting, and deciding.'],
  ['big-idea', 'BI2', 'A sense of purpose and adaptability are important for career-life development.'],
  ['big-idea', 'BI3', 'Family, mentors, community, and personal networks are essential in career-life development.'],
  ['big-idea', 'BI4', 'Reflecting on our learning experiences and knowing how we learn provides insight for career-life planning.'],
  ['curricular-competency', 'CC1', 'Recognize and explore diverse perspectives on how work contributes to community and personal well-being.', 'Personal career development'],
  ['curricular-competency', 'CC2', 'Apply a variety of research and inquiry strategies to explore career-life opportunities.', 'Personal career development'],
  ['curricular-competency', 'CC3', 'Demonstrate safety and inclusivity in learning and work environments.', 'Connections with community'],
  ['curricular-competency', 'CC4', 'Collaborate with mentors and networks to expand career-life possibilities.', 'Connections with community'],
  ['curricular-competency', 'CC5', 'Assess personal transferable skills and identify strengths and areas for growth.', 'Career-life planning'],
  ['content', 'CO1', 'Self-assessment of career-life development and transferable skills.'],
  ['content', 'CO2', 'Employment and post-secondary options, and their requirements.'],
  ['content', 'CO3', 'Workplace safety, rights, and responsibilities.'],
  ['content', 'CO4', 'Financial literacy for career-life planning, including budgeting and debt.'],
])

// ---------------------------------------------------------------------------
// Grade 11
// ---------------------------------------------------------------------------

const CHEMISTRY_11 = build('Chemistry', '11', 'CH11', [
  ['big-idea', 'BI1', 'Atoms and molecules are building blocks of matter.'],
  ['big-idea', 'BI2', 'Organic chemistry and its applications have significant implications for human health, society, and the environment.'],
  ['big-idea', 'BI3', 'Matter and energy are conserved in chemical reactions.'],
  ['big-idea', 'BI4', 'The mole is a quantity used to make atoms and molecules measurable.'],
  ...SCIENCE_COMPETENCIES,
  ['content', 'CO1', 'Safe and ethical practice, including WHMIS and the environmental implications of chemistry.'],
  ['content', 'CO2', 'Atomic theory, models of the atom, and electron arrangement.'],
  ['content', 'CO3', 'Periodic table organization and periodic trends.'],
  ['content', 'CO4', 'Chemical bonding: ionic, covalent, and intermolecular forces.'],
  ['content', 'CO5', 'Naming conventions and chemical formula writing.'],
  ['content', 'CO6', 'Organic chemistry: naming, structures, and isomers.'],
  ['content', 'CO7', 'The mole concept, molar mass, and Avogadro’s number.'],
  ['content', 'CO8', 'Stoichiometry, including limiting reagents and percent yield.'],
  ['content', 'CO9', 'Solution chemistry: concentration, dilution, and solubility.'],
  ['content', 'CO10', 'Types of chemical reactions and energy change (endothermic and exothermic).'],
])

const PHYSICS_11 = build('Physics', '11', 'PH11', [
  ['big-idea', 'BI1', 'An object’s motion can be predicted, analyzed, and described.'],
  ['big-idea', 'BI2', 'Forces influence the motion of an object.'],
  ['big-idea', 'BI3', 'Energy is found in different forms, is conserved, and has the ability to do work.'],
  ['big-idea', 'BI4', 'Mechanical waves transfer energy but not matter.'],
  ...SCIENCE_COMPETENCIES,
  ['content', 'CO1', 'Vector and scalar quantities.'],
  ['content', 'CO2', 'Uniform and accelerated motion, and graphical analysis of motion.'],
  ['content', 'CO3', 'Newton’s laws of motion.'],
  ['content', 'CO4', 'Forces including friction and gravity, and free-body diagrams.'],
  ['content', 'CO5', 'Work, power, and efficiency.'],
  ['content', 'CO6', 'Energy transformations and the conservation of energy.'],
  ['content', 'CO7', 'Momentum, impulse, and conservation of momentum.'],
  ['content', 'CO8', 'Wave characteristics and behaviour, including sound.'],
  ['content', 'CO9', 'The electromagnetic spectrum.'],
  ['content', 'CO10', 'Nuclear fission and fusion, and an introduction to special relativity.'],
])

const LIFE_SCI_11 = build('Life Sciences', '11', 'LS11', [
  ['big-idea', 'BI1', 'Life is a result of interactions at the molecular and cellular levels.'],
  ['big-idea', 'BI2', 'Evolution occurs at the population level.'],
  ['big-idea', 'BI3', 'Organisms are grouped based on common characteristics.'],
  ...SCIENCE_COMPETENCIES,
  ['content', 'CO1', 'Evolution by natural selection, and the evidence supporting it.'],
  ['content', 'CO2', 'Speciation and the mechanisms of evolutionary change.'],
  ['content', 'CO3', 'Taxonomic principles and phylogenetics.'],
  ['content', 'CO4', 'Microbiology: viruses, bacteria, protists, and fungi.'],
  ['content', 'CO5', 'Plant biology: structure, function, and reproduction.'],
  ['content', 'CO6', 'Animal biology: invertebrate and vertebrate diversity.'],
  ['content', 'CO7', 'Ecological interactions and the role of First Peoples knowledge of ecosystems.'],
])

const PRECALC_11 = build('Pre-calculus', '11', 'PC11', [
  ['big-idea', 'BI1', 'Algebraic reasoning enables us to explore, analyze, and apply mathematical ideas.'],
  ['big-idea', 'BI2', 'Quadratic relationships are prevalent in the world around us.'],
  ['big-idea', 'BI3', 'Trigonometry involves using proportional reasoning to solve indirect measurement problems.'],
  ['big-idea', 'BI4', 'Constructing and analyzing graphs helps us to interpret situations.'],
  ...MATH_COMPETENCIES,
  ['content', 'CO1', 'The real number system, absolute value, and radical operations.'],
  ['content', 'CO2', 'Powers with rational exponents.'],
  ['content', 'CO3', 'Factoring polynomial expressions.'],
  ['content', 'CO4', 'Rational expressions and equations.'],
  ['content', 'CO5', 'Quadratic functions: graphs, properties, and transformations.'],
  ['content', 'CO6', 'Quadratic equations and the quadratic formula.'],
  ['content', 'CO7', 'Linear and quadratic inequalities.'],
  ['content', 'CO8', 'Trigonometry of non-right triangles: the sine law and cosine law.'],
  ['content', 'CO9', 'Financial literacy: compound interest, investments, and loans.'],
])

// ---------------------------------------------------------------------------
// Grade 12
// ---------------------------------------------------------------------------

const CHEMISTRY_12 = build('Chemistry', '12', 'CH12', [
  ['big-idea', 'BI1', 'Dynamic equilibrium can be reached in reversible reactions.'],
  ['big-idea', 'BI2', 'The concentration of ions in solution determines its properties and reactivity.'],
  ['big-idea', 'BI3', 'Chemical reaction rates are influenced by the conditions of the reaction.'],
  ...SCIENCE_COMPETENCIES,
  ['content', 'CO1', 'Reaction kinetics: rate laws and factors affecting reaction rate.'],
  ['content', 'CO2', 'Reaction mechanisms and activation energy.'],
  ['content', 'CO3', 'Dynamic equilibrium and Le Châtelier’s principle.'],
  ['content', 'CO4', 'The equilibrium constant and equilibrium calculations.'],
  ['content', 'CO5', 'Solubility equilibria and the solubility product.'],
  ['content', 'CO6', 'Acids and bases: theories, strength, and pH.'],
  ['content', 'CO7', 'Acid–base titration and buffers.'],
  ['content', 'CO8', 'Oxidation–reduction reactions and electrochemistry.'],
])

const PHYSICS_12 = build('Physics', '12', 'PH12', [
  ['big-idea', 'BI1', 'Measurement of motion depends on our frame of reference.'],
  ['big-idea', 'BI2', 'Forces and energy interactions can be analyzed in two dimensions.'],
  ['big-idea', 'BI3', 'Fields exist and can be described mathematically.'],
  ...SCIENCE_COMPETENCIES,
  ['content', 'CO1', 'Vector analysis in two dimensions.'],
  ['content', 'CO2', 'Projectile motion and relative motion.'],
  ['content', 'CO3', 'Equilibrium, torque, and static systems.'],
  ['content', 'CO4', 'Circular motion and gravitation.'],
  ['content', 'CO5', 'Momentum and energy in two dimensions.'],
  ['content', 'CO6', 'Electrostatics and electric fields.'],
  ['content', 'CO7', 'Electric circuits: current, potential difference, and resistance.'],
  ['content', 'CO8', 'Magnetic fields and electromagnetic induction.'],
])

const PRECALC_12 = build('Pre-calculus', '12', 'PC12', [
  ['big-idea', 'BI1', 'Using inverses is the foundation of solving equations and can be extended to relationships between functions.'],
  ['big-idea', 'BI2', 'Understanding the characteristics of families of functions allows us to model and understand relationships.'],
  ['big-idea', 'BI3', 'Transformations of shapes extend to functions and relations in all of their representations.'],
  ['big-idea', 'BI4', 'Geometric sequences and series are examples of discrete exponential functions.'],
  ...MATH_COMPETENCIES,
  ['content', 'CO1', 'Transformations of functions and relations.'],
  ['content', 'CO2', 'Exponential functions and equations.'],
  ['content', 'CO3', 'Logarithms: operations, functions, and equations.'],
  ['content', 'CO4', 'Polynomial functions and equations.'],
  ['content', 'CO5', 'Rational functions and their graphs.'],
  ['content', 'CO6', 'Trigonometric functions, graphs, and the unit circle.'],
  ['content', 'CO7', 'Trigonometric identities and equations.'],
  ['content', 'CO8', 'Geometric sequences and series.'],
])

const CALCULUS_12 = build('Calculus', '12', 'CA12', [
  ['big-idea', 'BI1', 'The concept of a limit is foundational to calculus.'],
  ['big-idea', 'BI2', 'Differential calculus develops the concept of instantaneous rate of change.'],
  ['big-idea', 'BI3', 'Integral calculus develops the concept of finding the area under a curve.'],
  ...MATH_COMPETENCIES,
  ['content', 'CO1', 'Limits: notation, evaluation, and continuity.'],
  ['content', 'CO2', 'The derivative from first principles.'],
  ['content', 'CO3', 'Differentiation rules: power, product, quotient, and chain.'],
  ['content', 'CO4', 'Derivatives of trigonometric, exponential, and logarithmic functions.'],
  ['content', 'CO5', 'Curve sketching using first and second derivatives.'],
  ['content', 'CO6', 'Applications of derivatives: optimization and related rates.'],
  ['content', 'CO7', 'Antiderivatives and indefinite integrals.'],
  ['content', 'CO8', 'The definite integral and area under a curve.'],
])

const ENGLISH_12 = build('English Studies', '12', 'EN12', [
  ['big-idea', 'BI1', 'Language shapes ideas and influences others.'],
  ['big-idea', 'BI2', 'The exploration of text and story deepens our understanding of diverse, complex ideas about identity, others, and the world.'],
  ['big-idea', 'BI3', 'Texts are socially, culturally, geographically, and historically constructed.'],
  ['big-idea', 'BI4', 'People understand text differently depending on their worldviews and perspectives.'],
  ...ELA_COMPETENCIES,
  ['content', 'CO1', 'Text forms, genres, and their rhetorical purposes.'],
  ['content', 'CO2', 'Literary and persuasive devices and their effects on audience.'],
  ['content', 'CO3', 'First Peoples principles of learning and protocols relating to stories.'],
  ['content', 'CO4', 'Advanced elements of style: syntax, diction, register, and tone.'],
  ['content', 'CO5', 'Research processes, evaluation of sources, and academic citation.'],
  ['content', 'CO6', 'Presentation and argumentation techniques for a range of audiences.'],
])

export const BC_STANDARDS_1012: BcStandard[] = [
  ...SCIENCE_10,
  ...FMPC_10,
  ...ENGLISH_10,
  ...SOCIALS_10,
  ...CLE_1012,
  ...CHEMISTRY_11,
  ...PHYSICS_11,
  ...LIFE_SCI_11,
  ...PRECALC_11,
  ...CHEMISTRY_12,
  ...PHYSICS_12,
  ...PRECALC_12,
  ...CALCULUS_12,
  ...ENGLISH_12,
]

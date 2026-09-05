#!/usr/bin/env bun
import path from 'node:path'
import { cancel, intro, isCancel, outro, select } from '@clack/prompts'
import { type StateCode, STATE_LABEL_DE, STATE_ORDER } from '../src/lib/stateConfig'
import { type RunSplitStatesOptions, runStateFirstPipeline } from './lib/nationalPipeline'

const ALL_STATES = '__all__' as const

const ROOT = path.join(import.meta.dirname, '..')

intro('Match erzwingen + Split nach Bundesland')

const choice = await select({
  message: 'Alle oder ein Bundesland',
  options: [
    { value: ALL_STATES, label: 'Alle Bundesländer' },
    ...STATE_ORDER.map((c) => ({
      value: c,
      label: `${STATE_LABEL_DE[c]} (${c})`,
    })),
  ],
})

if (isCancel(choice)) {
  cancel('Abgebrochen.')
  process.exit(0)
}

const splitOpts: RunSplitStatesOptions | undefined =
  choice === ALL_STATES ? undefined : { onlyStates: [choice as StateCode] }

process.env.PIPELINE_FORCE_MATCH = '1'

const m = await runStateFirstPipeline(ROOT, splitOpts)
if (m.errors.length) console.warn(m.errors.join('\n'))

if (m.matchSkipped) {
  outro('Match übersprungen – keine Ausgabe.')
  process.exit(0)
}
outro('Fertig.')

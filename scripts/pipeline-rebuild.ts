#!/usr/bin/env bun
import { runPipelineRebuild } from './lib/nationalPipeline'
/**
 * pipeline:rebuild — nur Match + Split (keine Downloads).
 */
import path from 'node:path'

const ROOT = path.join(import.meta.dirname, '..')

const { errors } = await runPipelineRebuild(ROOT)
if (errors.length) console.warn(errors.join('\n'))

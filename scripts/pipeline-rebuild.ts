#!/usr/bin/env bun
/**
 * pipeline:rebuild — nur Match + Split (keine Downloads).
 */
import path from 'node:path'
import { runPipelineRebuild } from './lib/nationalPipeline'

const ROOT = path.join(import.meta.dirname, '..')

const { errors } = await runPipelineRebuild(ROOT)
if (errors.length) console.warn(errors.join('\n'))

#!/usr/bin/env bun
import path from 'node:path'
import { runStateFirstPipeline } from './lib/nationalPipeline'

const ROOT = path.join(import.meta.dirname, '..')

const { errors } = await runStateFirstPipeline(ROOT)
if (errors.length) console.warn(errors.join('\n'))

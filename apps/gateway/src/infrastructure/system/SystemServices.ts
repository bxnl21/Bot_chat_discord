import { randomUUID } from 'node:crypto';
import { Clock, IdGenerator } from '../../application/ports/Ports';
export class SystemClock implements Clock { now(): Date { return new Date(); } }
export class UuidGenerator implements IdGenerator { generate(): string { return randomUUID(); } }

import { describe, expect, it } from 'vitest';
import {
  addParticipant,
  createTrip,
  renameMeInAllTrips,
  updateParticipant,
} from '@/commands/index';
import { findMe, listParticipants, localActorId } from '@/db/repositories';
import { pendingCount, pendingOps } from '@/sync/outbox';
import { makeContext, openTestDb } from './_harness';

/** Reproduz a viagem como a b50 a criava: o dono entra chamado "Você". */
function viagemDaB50(db: ReturnType<typeof openTestDb>, ctx: ReturnType<typeof makeContext>, nome: string) {
  const tripId = createTrip(db, ctx, { name: nome, baseCurrency: 'BRL' });
  addParticipant(db, ctx, { tripId, displayName: 'Você', userId: localActorId(db) });
  addParticipant(db, ctx, { tripId, displayName: 'Lúcia' });
  return tripId;
}

describe('renameMeInAllTrips', () => {
  it('renomeia "Você" em todas as viagens de uma vez', () => {
    const db = openTestDb();
    const ctx = makeContext();
    const chile = viagemDaB50(db, ctx, 'Chile');
    const japao = viagemDaB50(db, ctx, 'Japão');

    expect(renameMeInAllTrips(db, ctx, 'Fernando')).toBe(2);
    expect(findMe(db, chile)?.display_name).toBe('Fernando');
    expect(findMe(db, japao)?.display_name).toBe('Fernando');
  });

  it('não toca em quem já tem nome escolhido', () => {
    const db = openTestDb();
    const ctx = makeContext();
    const tripId = viagemDaB50(db, ctx, 'Chile');
    const eu = findMe(db, tripId);
    updateParticipant(db, ctx, { participantId: eu?.id ?? '', displayName: 'Fernandão' });

    expect(renameMeInAllTrips(db, ctx, 'Fernando')).toBe(0);
    expect(findMe(db, tripId)?.display_name).toBe('Fernandão');
  });

  it('não mexe nos outros participantes', () => {
    const db = openTestDb();
    const ctx = makeContext();
    const tripId = viagemDaB50(db, ctx, 'Chile');

    renameMeInAllTrips(db, ctx, 'Fernando');
    expect(listParticipants(db, tripId).map((p) => p.display_name).sort()).toEqual(['Fernando', 'Lúcia']);
  });

  it('sobe o lamport e escreve no outbox, senão os outros aparelhos não veem', () => {
    const db = openTestDb();
    const ctx = makeContext();
    const tripId = viagemDaB50(db, ctx, 'Chile');
    const antes = findMe(db, tripId);
    const opsAntes = pendingCount(db);
    const versaoAntes =
      db.get<{ lamport: number }>('SELECT lamport FROM participants WHERE id = ?', [antes?.id ?? ''])
        ?.lamport ?? 0;

    renameMeInAllTrips(db, ctx, 'Fernando');

    // `ParticipantRow` não expõe `lamport`, então lê-se a coluna direto.
    const versao = (id: string): number =>
      db.get<{ lamport: number }>('SELECT lamport FROM participants WHERE id = ?', [id])?.lamport ?? 0;

    const depois = findMe(db, tripId);
    expect(depois?.display_name).toBe('Fernando');
    expect(versao(antes?.id ?? '')).toBeGreaterThan(versaoAntes);

    // Uma operação nova, do participante certo, carregando o nome novo e a
    // versão nova — é isso que faz o outro aparelho deixar de ver "Você".
    expect(pendingCount(db)).toBe(opsAntes + 1);
    const op = pendingOps(db, 200).at(-1);
    expect(op?.entity).toBe('participant');
    expect(op?.entityId).toBe(antes?.id);
    expect(JSON.stringify(op?.payload)).toContain('Fernando');
    // Sem igualar `op.lamport` a `participants.lamport`: são contadores
    // diferentes. O do outbox é do aparelho, e serve para ordenar o envio; o
    // da linha é a versão daquele participante, e é ela que `pushParticipantRow`
    // manda como `p_lamport` para o servidor desempatar.
    expect(op?.lamport).toBeGreaterThan(0);
  });

  it('recusa nome vazio, só espaços, ou o próprio "Você"', () => {
    const db = openTestDb();
    const ctx = makeContext();
    const tripId = viagemDaB50(db, ctx, 'Chile');

    expect(renameMeInAllTrips(db, ctx, '')).toBe(0);
    expect(renameMeInAllTrips(db, ctx, '   ')).toBe(0);
    expect(renameMeInAllTrips(db, ctx, 'Você')).toBe(0);
    expect(findMe(db, tripId)?.display_name).toBe('Você');
  });

  it('rodar duas vezes não gera trabalho novo', () => {
    const db = openTestDb();
    const ctx = makeContext();
    viagemDaB50(db, ctx, 'Chile');

    expect(renameMeInAllTrips(db, ctx, 'Fernando')).toBe(1);
    expect(renameMeInAllTrips(db, ctx, 'Fernando')).toBe(0);
  });
});

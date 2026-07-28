import type { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '../../lib/prisma';

type DependencyStatus = 'connected' | 'unavailable' | 'not_configured';

type HealthResponse = {
  status: 'healthy' | 'unhealthy';
  service: 'sealedcast-api';
  dependencies: {
    database: DependencyStatus;
    indexer: DependencyStatus;
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({
      status: 'unhealthy',
      service: 'sealedcast-api',
      dependencies: {
        database: 'unavailable',
        indexer: 'not_configured'
      }
    });
  }

  let database: DependencyStatus = 'unavailable';
  let indexer: DependencyStatus = process.env.INDEXER_API_URL
    ? 'unavailable'
    : 'not_configured';

  try {
    const [tables] = await prisma.$queryRaw<
      Array<{ casts: string | null; sealed_casts: string | null }>
    >`SELECT to_regclass('public.casts')::text AS casts,
             to_regclass('public.sealed_casts')::text AS sealed_casts`;

    if (tables?.casts && tables.sealed_casts) {
      database = 'connected';
    }
  } catch (error) {
    console.error('Database health check failed', error);
  }

  if (process.env.INDEXER_API_URL) {
    try {
      const response = await fetch(process.env.INDEXER_API_URL, {
        signal: AbortSignal.timeout(3_000)
      });
      indexer = response.ok ? 'connected' : 'unavailable';
    } catch (error) {
      console.error('Indexer health check failed', error);
    }
  }

  const status = database === 'connected' ? 'healthy' : 'unhealthy';

  return res.status(status === 'healthy' ? 200 : 503).json({
    status,
    service: 'sealedcast-api',
    dependencies: { database, indexer }
  });
}

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * Validates request body against a Zod schema
 */
export async function validateRequestBody<T>(
  req: NextRequest,
  schema: z.ZodSchema<T>
): Promise<
  { success: true; data: T } | { success: false; error: NextResponse }
> {
  try {
    const body = await req.json()
    const validatedData = schema.parse(body)
    return { success: true, data: validatedData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: NextResponse.json(
          {
            error: 'Datos de entrada inválidos',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
            })),
            success: false,
          },
          { status: 400 }
        ),
      }
    }

    return {
      success: false,
      error: NextResponse.json(
        { error: 'Error al procesar la solicitud', success: false },
        { status: 400 }
      ),
    }
  }
}

/**
 * Validates query parameters against a Zod schema
 */
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: NextResponse } {
  try {
    const params = Object.fromEntries(searchParams.entries())
    const validatedData = schema.parse(params)
    return { success: true, data: validatedData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: NextResponse.json(
          {
            error: 'Parámetros de consulta inválidos',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
            })),
            success: false,
          },
          { status: 400 }
        ),
      }
    }

    return {
      success: false,
      error: NextResponse.json(
        { error: 'Error al procesar los parámetros', success: false },
        { status: 400 }
      ),
    }
  }
}

/**
 * Validates route parameters against a Zod schema
 */
export function validateRouteParams<T>(
  params: Record<string, string>,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: NextResponse } {
  try {
    const validatedData = schema.parse(params)
    return { success: true, data: validatedData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: NextResponse.json(
          {
            error: 'Parámetros de ruta inválidos',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
            })),
            success: false,
          },
          { status: 400 }
        ),
      }
    }

    return {
      success: false,
      error: NextResponse.json(
        { error: 'Error al procesar los parámetros de ruta', success: false },
        { status: 400 }
      ),
    }
  }
}

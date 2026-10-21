export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      alerta_apoyos: {
        Row: {
          alerta_id: string
          chofer_id: string
          creado_en: string
        }
        Insert: {
          alerta_id: string
          chofer_id: string
          creado_en?: string
        }
        Update: {
          alerta_id?: string
          chofer_id?: string
          creado_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerta_apoyos_alerta_id_fkey"
            columns: ["alerta_id"]
            isOneToOne: false
            referencedRelation: "alertas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerta_apoyos_chofer_id_fkey"
            columns: ["chofer_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      alertas: {
        Row: {
          chofer_id: string
          creado_en: string
          estado: Database["public"]["Enums"]["estado_alerta"]
          id: string
          lat: number | null
          lng: number | null
          resuelta_en: string | null
          tipo: Database["public"]["Enums"]["tipo_alerta"]
        }
        Insert: {
          chofer_id: string
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_alerta"]
          id?: string
          lat?: number | null
          lng?: number | null
          resuelta_en?: string | null
          tipo: Database["public"]["Enums"]["tipo_alerta"]
        }
        Update: {
          chofer_id?: string
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_alerta"]
          id?: string
          lat?: number | null
          lng?: number | null
          resuelta_en?: string | null
          tipo?: Database["public"]["Enums"]["tipo_alerta"]
        }
        Relationships: [
          {
            foreignKeyName: "alertas_chofer_id_fkey"
            columns: ["chofer_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      avisos: {
        Row: {
          autor_id: string
          creado_en: string
          id: string
          texto: string
        }
        Insert: {
          autor_id?: string
          creado_en?: string
          id?: string
          texto: string
        }
        Update: {
          autor_id?: string
          creado_en?: string
          id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "avisos_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calificaciones: {
        Row: {
          chofer_id: string
          comentario: string | null
          creado_en: string
          estrellas: number
          etiquetas: string[]
          id: string
          pasajero_id: string
          viaje_id: string
        }
        Insert: {
          chofer_id: string
          comentario?: string | null
          creado_en?: string
          estrellas: number
          etiquetas?: string[]
          id?: string
          pasajero_id: string
          viaje_id: string
        }
        Update: {
          chofer_id?: string
          comentario?: string | null
          creado_en?: string
          estrellas?: number
          etiquetas?: string[]
          id?: string
          pasajero_id?: string
          viaje_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calificaciones_chofer_id_fkey"
            columns: ["chofer_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calificaciones_pasajero_id_fkey"
            columns: ["pasajero_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calificaciones_viaje_id_fkey"
            columns: ["viaje_id"]
            isOneToOne: false
            referencedRelation: "viajes"
            referencedColumns: ["id"]
          },
        ]
      }
      esperas: {
        Row: {
          cerrada_en: string | null
          creado_en: string
          estado: Database["public"]["Enums"]["estado_espera"]
          id: string
          lat: number | null
          lng: number | null
          lugar: string | null
          pasajero_id: string
          personas: number
          sentido: Database["public"]["Enums"]["sentido"]
        }
        Insert: {
          cerrada_en?: string | null
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_espera"]
          id?: string
          lat?: number | null
          lng?: number | null
          lugar?: string | null
          pasajero_id: string
          personas?: number
          sentido: Database["public"]["Enums"]["sentido"]
        }
        Update: {
          cerrada_en?: string | null
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_espera"]
          id?: string
          lat?: number | null
          lng?: number | null
          lugar?: string | null
          pasajero_id?: string
          personas?: number
          sentido?: Database["public"]["Enums"]["sentido"]
        }
        Relationships: [
          {
            foreignKeyName: "esperas_pasajero_id_fkey"
            columns: ["pasajero_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lista_gina: {
        Row: {
          cerrada_en: string | null
          creada_en: string
          en_gina: boolean
          estado: Database["public"]["Enums"]["estado_en_lista"]
          id: string
          lugar: string | null
          pasajero_id: string
          personas: number
          reserva_id: string | null
          vence_en: string
          viaje_id: string | null
        }
        Insert: {
          cerrada_en?: string | null
          creada_en?: string
          en_gina: boolean
          estado?: Database["public"]["Enums"]["estado_en_lista"]
          id?: string
          lugar?: string | null
          pasajero_id: string
          personas?: number
          reserva_id?: string | null
          vence_en?: string
          viaje_id?: string | null
        }
        Update: {
          cerrada_en?: string | null
          creada_en?: string
          en_gina?: boolean
          estado?: Database["public"]["Enums"]["estado_en_lista"]
          id?: string
          lugar?: string | null
          pasajero_id?: string
          personas?: number
          reserva_id?: string | null
          vence_en?: string
          viaje_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lista_gina_pasajero_id_fkey"
            columns: ["pasajero_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lista_gina_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lista_gina_viaje_id_fkey"
            columns: ["viaje_id"]
            isOneToOne: false
            referencedRelation: "viajes"
            referencedColumns: ["id"]
          },
        ]
      }
      lista_gina_privado: {
        Row: {
          distancia_m: number | null
          id: string
          lat: number | null
          lng: number | null
        }
        Insert: {
          distancia_m?: number | null
          id: string
          lat?: number | null
          lng?: number | null
        }
        Update: {
          distancia_m?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lista_gina_privado_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "lista_gina"
            referencedColumns: ["id"]
          },
        ]
      }
      paradas: {
        Row: {
          activa: boolean
          creado_en: string
          id: string
          lat: number
          lng: number
          nombre: string
          referencia: string | null
        }
        Insert: {
          activa?: boolean
          creado_en?: string
          id?: string
          lat: number
          lng: number
          nombre: string
          referencia?: string | null
        }
        Update: {
          activa?: boolean
          creado_en?: string
          id?: string
          lat?: number
          lng?: number
          nombre?: string
          referencia?: string | null
        }
        Relationships: []
      }
      paradas_sentido: {
        Row: {
          orden: number
          parada_id: string
          sentido: Database["public"]["Enums"]["sentido"]
        }
        Insert: {
          orden: number
          parada_id: string
          sentido: Database["public"]["Enums"]["sentido"]
        }
        Update: {
          orden?: number
          parada_id?: string
          sentido?: Database["public"]["Enums"]["sentido"]
        }
        Relationships: [
          {
            foreignKeyName: "paradas_sentido_parada_id_fkey"
            columns: ["parada_id"]
            isOneToOne: false
            referencedRelation: "paradas"
            referencedColumns: ["id"]
          },
        ]
      }
      pausas: {
        Row: {
          cerrada_en: string | null
          chofer_id: string
          id: string
          inicio: string
          vuelve_en: string | null
        }
        Insert: {
          cerrada_en?: string | null
          chofer_id: string
          id?: string
          inicio?: string
          vuelve_en?: string | null
        }
        Update: {
          cerrada_en?: string | null
          chofer_id?: string
          id?: string
          inicio?: string
          vuelve_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pausas_chofer_id_fkey"
            columns: ["chofer_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles: {
        Row: {
          aprobado_en: string | null
          aprobado_por: string | null
          conectado_en: string | null
          creado_en: string
          debe_cambiar_clave: boolean
          estado: Database["public"]["Enums"]["estado_cuenta"]
          foto_path: string | null
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["rol_usuario"]
          urbanismo: string | null
        }
        Insert: {
          aprobado_en?: string | null
          aprobado_por?: string | null
          conectado_en?: string | null
          creado_en?: string
          debe_cambiar_clave?: boolean
          estado?: Database["public"]["Enums"]["estado_cuenta"]
          foto_path?: string | null
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["rol_usuario"]
          urbanismo?: string | null
        }
        Update: {
          aprobado_en?: string | null
          aprobado_por?: string | null
          conectado_en?: string | null
          creado_en?: string
          debe_cambiar_clave?: boolean
          estado?: Database["public"]["Enums"]["estado_cuenta"]
          foto_path?: string | null
          id?: string
          nombre?: string
          rol?: Database["public"]["Enums"]["rol_usuario"]
          urbanismo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perfiles_aprobado_por_fkey"
            columns: ["aprobado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles_privados: {
        Row: {
          cedula: string | null
          id: string
          telefono: string
        }
        Insert: {
          cedula?: string | null
          id: string
          telefono: string
        }
        Update: {
          cedula?: string | null
          id?: string
          telefono?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfiles_privados_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posiciones: {
        Row: {
          actualizada_en: string
          chofer_id: string
          lat: number
          lng: number
          precision_m: number | null
        }
        Insert: {
          actualizada_en?: string
          chofer_id: string
          lat: number
          lng: number
          precision_m?: number | null
        }
        Update: {
          actualizada_en?: string
          chofer_id?: string
          lat?: number
          lng?: number
          precision_m?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "posiciones_chofer_id_fkey"
            columns: ["chofer_id"]
            isOneToOne: true
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reservas: {
        Row: {
          aceptada_en: string | null
          agregada_por: string | null
          calificacion_omitida: boolean
          cerrada_en: string | null
          creado_en: string
          en_camino: boolean
          estado: Database["public"]["Enums"]["estado_reserva"]
          id: string
          lat: number | null
          listo: boolean
          lng: number | null
          lugar: string | null
          nombre: string | null
          pasajero_id: string | null
          pendiente: boolean
          personas: number
          viaje_id: string
        }
        Insert: {
          aceptada_en?: string | null
          agregada_por?: string | null
          calificacion_omitida?: boolean
          cerrada_en?: string | null
          creado_en?: string
          en_camino?: boolean
          estado?: Database["public"]["Enums"]["estado_reserva"]
          id?: string
          lat?: number | null
          listo?: boolean
          lng?: number | null
          lugar?: string | null
          nombre?: string | null
          pasajero_id?: string | null
          pendiente?: boolean
          personas?: number
          viaje_id: string
        }
        Update: {
          aceptada_en?: string | null
          agregada_por?: string | null
          calificacion_omitida?: boolean
          cerrada_en?: string | null
          creado_en?: string
          en_camino?: boolean
          estado?: Database["public"]["Enums"]["estado_reserva"]
          id?: string
          lat?: number | null
          listo?: boolean
          lng?: number | null
          lugar?: string | null
          nombre?: string | null
          pasajero_id?: string | null
          pendiente?: boolean
          personas?: number
          viaje_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservas_agregada_por_fkey"
            columns: ["agregada_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_pasajero_id_fkey"
            columns: ["pasajero_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_viaje_id_fkey"
            columns: ["viaje_id"]
            isOneToOne: false
            referencedRelation: "viajes"
            referencedColumns: ["id"]
          },
        ]
      }
      senales: {
        Row: {
          cerrada_en: string | null
          creada_en: string
          distancia_m: number | null
          estado: Database["public"]["Enums"]["estado_senal"]
          id: string
          parada_id: string
          pasajero_id: string
          personas: number
          sentido: Database["public"]["Enums"]["sentido"]
          vence_en: string
        }
        Insert: {
          cerrada_en?: string | null
          creada_en?: string
          distancia_m?: number | null
          estado?: Database["public"]["Enums"]["estado_senal"]
          id?: string
          parada_id: string
          pasajero_id: string
          personas?: number
          sentido: Database["public"]["Enums"]["sentido"]
          vence_en?: string
        }
        Update: {
          cerrada_en?: string | null
          creada_en?: string
          distancia_m?: number | null
          estado?: Database["public"]["Enums"]["estado_senal"]
          id?: string
          parada_id?: string
          pasajero_id?: string
          personas?: number
          sentido?: Database["public"]["Enums"]["sentido"]
          vence_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "senales_parada_id_fkey"
            columns: ["parada_id"]
            isOneToOne: false
            referencedRelation: "paradas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "senales_pasajero_id_fkey"
            columns: ["pasajero_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehiculos: {
        Row: {
          aire_acondicionado: boolean
          chofer_id: string
          color: string | null
          foto_path: string | null
          id: string
          modelo: string | null
          placa: string
          unidad: string | null
        }
        Insert: {
          aire_acondicionado?: boolean
          chofer_id: string
          color?: string | null
          foto_path?: string | null
          id?: string
          modelo?: string | null
          placa: string
          unidad?: string | null
        }
        Update: {
          aire_acondicionado?: boolean
          chofer_id?: string
          color?: string | null
          foto_path?: string | null
          id?: string
          modelo?: string | null
          placa?: string
          unidad?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehiculos_chofer_id_fkey"
            columns: ["chofer_id"]
            isOneToOne: true
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      viaje_eventos: {
        Row: {
          en: string
          estado: Database["public"]["Enums"]["estado_viaje"]
          eta_min: number | null
          id: number
          viaje_id: string
        }
        Insert: {
          en?: string
          estado: Database["public"]["Enums"]["estado_viaje"]
          eta_min?: number | null
          id?: never
          viaje_id: string
        }
        Update: {
          en?: string
          estado?: Database["public"]["Enums"]["estado_viaje"]
          eta_min?: number | null
          id?: never
          viaje_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "viaje_eventos_viaje_id_fkey"
            columns: ["viaje_id"]
            isOneToOne: false
            referencedRelation: "viajes"
            referencedColumns: ["id"]
          },
        ]
      }
      viajes: {
        Row: {
          chofer_id: string
          creado_en: string
          despues_de: string | null
          estado: Database["public"]["Enums"]["estado_viaje"]
          estado_en: string
          eta_min: number
          hora_fija: string | null
          id: string
          llegada_en: string | null
          ocupados: number
          puestos: number
          salida_en: string | null
          sentido: Database["public"]["Enums"]["sentido"]
        }
        Insert: {
          chofer_id: string
          creado_en?: string
          despues_de?: string | null
          estado: Database["public"]["Enums"]["estado_viaje"]
          estado_en?: string
          eta_min?: number
          hora_fija?: string | null
          id?: string
          llegada_en?: string | null
          ocupados?: number
          puestos: number
          salida_en?: string | null
          sentido: Database["public"]["Enums"]["sentido"]
        }
        Update: {
          chofer_id?: string
          creado_en?: string
          despues_de?: string | null
          estado?: Database["public"]["Enums"]["estado_viaje"]
          estado_en?: string
          eta_min?: number
          hora_fija?: string | null
          id?: string
          llegada_en?: string | null
          ocupados?: number
          puestos?: number
          salida_en?: string | null
          sentido?: Database["public"]["Enums"]["sentido"]
        }
        Relationships: [
          {
            foreignKeyName: "viajes_chofer_id_fkey"
            columns: ["chofer_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viajes_despues_de_fkey"
            columns: ["despues_de"]
            isOneToOne: false
            referencedRelation: "viajes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _acepta_reservas: {
        Args: { v: Database["public"]["Tables"]["viajes"]["Row"] }
        Returns: boolean
      }
      _cerrar_espera: {
        Args: {
          p_estado: Database["public"]["Enums"]["estado_espera"]
          p_pasajero: string
        }
        Returns: undefined
      }
      _cerrar_pedidos: { Args: { p_viaje: string }; Returns: undefined }
      _cerrar_reserva_activa: {
        Args: { p_pasajero: string }
        Returns: undefined
      }
      _compactar_paradas: {
        Args: { p_sentido: Database["public"]["Enums"]["sentido"] }
        Returns: undefined
      }
      _exigir_aprobado: {
        Args: never
        Returns: {
          aprobado_en: string | null
          aprobado_por: string | null
          conectado_en: string | null
          creado_en: string
          debe_cambiar_clave: boolean
          estado: Database["public"]["Enums"]["estado_cuenta"]
          foto_path: string | null
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["rol_usuario"]
          urbanismo: string | null
        }
        SetofOptions: {
          from: "*"
          to: "perfiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _exigir_chofer: {
        Args: never
        Returns: {
          aprobado_en: string | null
          aprobado_por: string | null
          conectado_en: string | null
          creado_en: string
          debe_cambiar_clave: boolean
          estado: Database["public"]["Enums"]["estado_cuenta"]
          foto_path: string | null
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["rol_usuario"]
          urbanismo: string | null
        }
        SetofOptions: {
          from: "*"
          to: "perfiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _exigir_pasajero: {
        Args: never
        Returns: {
          aprobado_en: string | null
          aprobado_por: string | null
          conectado_en: string | null
          creado_en: string
          debe_cambiar_clave: boolean
          estado: Database["public"]["Enums"]["estado_cuenta"]
          foto_path: string | null
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["rol_usuario"]
          urbanismo: string | null
        }
        SetofOptions: {
          from: "*"
          to: "perfiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _mi_fila: {
        Args: never
        Returns: {
          parada_id: string
          sentido: Database["public"]["Enums"]["sentido"]
        }[]
      }
      _mi_viaje: {
        Args: { p_viaje: string }
        Returns: {
          chofer_id: string
          creado_en: string
          despues_de: string | null
          estado: Database["public"]["Enums"]["estado_viaje"]
          estado_en: string
          eta_min: number
          hora_fija: string | null
          id: string
          llegada_en: string | null
          ocupados: number
          puestos: number
          salida_en: string | null
          sentido: Database["public"]["Enums"]["sentido"]
        }
        SetofOptions: {
          from: "*"
          to: "viajes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _ocupado_por_otros: { Args: { p_viaje: string }; Returns: string[] }
      _plan_gina: {
        Args: { p_excluir?: string[]; p_viaje: string }
        Returns: {
          cabe: boolean
          entrada_id: string
          rol: string
        }[]
      }
      _promover: { Args: { p_chofer: string }; Returns: undefined }
      _reserva: {
        Args: { p_reserva: string }
        Returns: {
          aceptada_en: string | null
          agregada_por: string | null
          calificacion_omitida: boolean
          cerrada_en: string | null
          creado_en: string
          en_camino: boolean
          estado: Database["public"]["Enums"]["estado_reserva"]
          id: string
          lat: number | null
          listo: boolean
          lng: number | null
          lugar: string | null
          nombre: string | null
          pasajero_id: string | null
          pendiente: boolean
          personas: number
          viaje_id: string
        }
        SetofOptions: {
          from: "*"
          to: "reservas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _validar_lugar: {
        Args: { p_lat: number; p_lng: number; p_lugar: string }
        Returns: undefined
      }
      _vincular_camino: { Args: { p_viaje: string }; Returns: undefined }
      admin_actividad: {
        Args: never
        Returns: {
          calificaciones: number
          conectado: boolean
          estrellas: number
          id: string
          ultimo_viaje: string
          viajes: number
        }[]
      }
      admin_cuentas: {
        Args: { p_estado?: Database["public"]["Enums"]["estado_cuenta"] }
        Returns: {
          aire_acondicionado: boolean
          aprobado_en: string
          cedula: string
          color: string
          creado_en: string
          estado: Database["public"]["Enums"]["estado_cuenta"]
          foto_carro_path: string
          foto_path: string
          id: string
          modelo: string
          nombre: string
          placa: string
          rol: Database["public"]["Enums"]["rol_usuario"]
          telefono: string
          unidad: string
          urbanismo: string
        }[]
      }
      admin_datos_privados: {
        Args: { p_usuario: string }
        Returns: {
          cedula: string
          telefono: string
        }[]
      }
      admin_demanda: {
        Args: never
        Returns: {
          creado_en: string
          foto_path: string
          id: string
          lat: number
          lng: number
          lugar: string
          nombre: string
          pasajero_id: string
          personas: number
          sentido: Database["public"]["Enums"]["sentido"]
          telefono: string
        }[]
      }
      admin_demanda_hoy: {
        Args: never
        Returns: {
          cancelaron: number
          consiguieron: number
          espera_promedio_min: number
          pedidos: number
          sin_transporte: number
        }[]
      }
      admin_historial: {
        Args: { p_usuario: string }
        Returns: {
          calificaciones: number
          reservas: number
          viajes: number
        }[]
      }
      admin_resumen: {
        Args: never
        Returns: {
          calificaciones_7d: number
          estrellas_7d: number
          pasajeros_esperando: number
          pasajeros_hoy: number
          registros_7d: number
          viajes_en_curso: number
          viajes_hoy: number
        }[]
      }
      admin_uso_pasajeros: {
        Args: { p_desde: string }
        Returns: {
          foto_path: string
          nombre: string
          pasajero_id: string
          primer_viaje: string
          ultimo_viaje: string
          viajes: number
        }[]
      }
      admin_uso_por_chofer: {
        Args: { p_desde: string }
        Returns: {
          a_mano: number
          app: number
          chofer_id: string
          en_camino: number
          nombre: string
        }[]
      }
      apoyar_alerta: { Args: { p_alerta: string }; Returns: undefined }
      aprobar_cuenta: {
        Args: { p_aprobar: boolean; p_usuario: string }
        Returns: undefined
      }
      avanzar_viaje: {
        Args: {
          p_estado: Database["public"]["Enums"]["estado_viaje"]
          p_viaje: string
        }
        Returns: undefined
      }
      cambiar_lugar: {
        Args: {
          p_lat?: number
          p_lng?: number
          p_lugar?: string
          p_reserva: string
        }
        Returns: undefined
      }
      cambiar_puestos: {
        Args: { p_puestos: number; p_viaje: string }
        Returns: undefined
      }
      cancelar_espera: { Args: never; Returns: undefined }
      cancelar_reserva: { Args: { p_reserva: string }; Returns: undefined }
      cancelar_viaje: { Args: { p_viaje: string }; Returns: undefined }
      choferes_en_pausa: {
        Args: never
        Returns: {
          chofer_id: string
          foto_path: string
          nombre: string
          vuelve_en: string
        }[]
      }
      clave_cambiada: { Args: never; Returns: undefined }
      conectar: { Args: never; Returns: undefined }
      correo_de_telefono: { Args: { p_telefono: string }; Returns: string }
      crear_admin: {
        Args: { p_clave: string; p_id?: string; p_usuario: string }
        Returns: string
      }
      crear_alerta: {
        Args: {
          p_lat?: number
          p_lng?: number
          p_tipo: Database["public"]["Enums"]["tipo_alerta"]
        }
        Returns: string
      }
      demanda_por_sentido: {
        Args: never
        Returns: {
          esperando: number
          sentido: Database["public"]["Enums"]["sentido"]
        }[]
      }
      desactivar_parada: { Args: { p_id: string }; Returns: undefined }
      desconectar: { Args: { p_vuelve_en?: string }; Returns: undefined }
      desconectar_inactivos: { Args: never; Returns: undefined }
      eliminar_cuenta: {
        Args: { p_con_historial?: boolean; p_usuario: string }
        Returns: undefined
      }
      es_admin: { Args: never; Returns: boolean }
      es_aprobado: { Args: never; Returns: boolean }
      es_chofer: { Args: never; Returns: boolean }
      esperan_conmigo: {
        Args: never
        Returns: {
          desde: string
          nombre_corto: string
          personas: number
          soy_yo: boolean
        }[]
      }
      esperando_para_choferes: {
        Args: never
        Returns: {
          creado_en: string
          foto_path: string
          id: string
          lat: number
          lng: number
          lugar: string
          nombre: string
          personas: number
          sentido: Database["public"]["Enums"]["sentido"]
          telefono: string
        }[]
      }
      esperando_por_parada: {
        Args: { p_sentido: Database["public"]["Enums"]["sentido"] }
        Returns: {
          avisos: number
          parada_id: string
          personas: number
        }[]
      }
      estoy_en_la_parada: {
        Args: {
          p_distancia_m?: number
          p_parada: string
          p_personas?: number
          p_sentido: Database["public"]["Enums"]["sentido"]
        }
        Returns: string
      }
      estoy_en_lista: {
        Args: {
          p_distancia_m?: number
          p_en_gina: boolean
          p_lat?: number
          p_lng?: number
          p_lugar?: string
          p_personas?: number
        }
        Returns: string
      }
      fila_de_parada: {
        Args: {
          p_parada: string
          p_sentido: Database["public"]["Enums"]["sentido"]
        }
        Returns: {
          creada_en: string
          distancia_m: number
          es_mio: boolean
          foto_path: string
          id: string
          nombre: string
          personas: number
          posicion: number
        }[]
      }
      guardar_parada: {
        Args: {
          p_id: string
          p_lat: number
          p_lng: number
          p_nombre: string
          p_referencia: string
          p_sentidos: Database["public"]["Enums"]["sentido"][]
        }
        Returns: string
      }
      lista_de_gina: {
        Args: never
        Returns: {
          creada_en: string
          en_gina: boolean
          es_mio: boolean
          foto_path: string
          id: string
          lugar: string
          nombre: string
          personas: number
          posicion: number
          vence_en: string
        }[]
      }
      lista_para_choferes: {
        Args: never
        Returns: {
          creada_en: string
          en_gina: boolean
          foto_path: string
          id: string
          lat: number
          lng: number
          lugar: string
          nombre: string
          personas: number
          posicion: number
          telefono: string
        }[]
      }
      lista_viaje: {
        Args: { p_viaje: string }
        Returns: {
          confirmado: boolean
          desde: number
          en_camino: boolean
          es_mio: boolean
          hasta: number
          listo: boolean
          nombre_corto: string
          pendiente: boolean
          personas: number
          posicion: number
        }[]
      }
      marcar_espera: {
        Args: {
          p_lat?: number
          p_lng?: number
          p_lugar?: string
          p_personas?: number
          p_sentido: Database["public"]["Enums"]["sentido"]
        }
        Returns: string
      }
      marcar_listo: {
        Args: { p_listo?: boolean; p_reserva: string }
        Returns: undefined
      }
      marcar_no_vino: { Args: { p_reserva: string }; Returns: undefined }
      marcar_se_bajo: { Args: { p_reserva: string }; Returns: undefined }
      marcar_subio: { Args: { p_reserva: string }; Returns: undefined }
      me_fui: { Args: never; Returns: undefined }
      mis_datos_privados: {
        Args: never
        Returns: {
          cedula: string
          telefono: string
        }[]
      }
      mis_lugares_recientes: {
        Args: never
        Returns: {
          lugar: string
        }[]
      }
      no_estaba_en_lista: { Args: { p_entrada: string }; Returns: undefined }
      nombre_corto: { Args: { p_nombre: string }; Returns: string }
      normalizar_telefono: { Args: { p_telefono: string }; Returns: string }
      ocupar_puesto: {
        Args: { p_nombre?: string; p_viaje: string }
        Returns: string
      }
      omitir_calificacion: { Args: { p_reserva: string }; Returns: undefined }
      ordenar_paradas: {
        Args: {
          p_ids: string[]
          p_sentido: Database["public"]["Enums"]["sentido"]
        }
        Returns: undefined
      }
      plan_de_gina: {
        Args: { p_viaje: string }
        Returns: {
          cabe: boolean
          creada_en: string
          en_gina: boolean
          foto_path: string
          id: string
          lat: number
          lng: number
          lugar: string
          nombre: string
          personas: number
          posicion: number
          rol: string
          telefono: string
        }[]
      }
      posicion_reserva: { Args: { p_reserva: string }; Returns: number }
      publicar_viaje: {
        Args: {
          p_eta_min?: number
          p_hora_fija?: string
          p_puestos: number
          p_sentido: Database["public"]["Enums"]["sentido"]
        }
        Returns: string
      }
      puede_ver_telefono: { Args: { p_objetivo: string }; Returns: boolean }
      quitar_anotado: { Args: { p_reserva: string }; Returns: undefined }
      reservar: {
        Args: {
          p_lat?: number
          p_lng?: number
          p_lugar?: string
          p_personas?: number
          p_viaje: string
        }
        Returns: string
      }
      resolver_alerta: { Args: { p_alerta: string }; Returns: undefined }
      responder_pedido: {
        Args: { p_acepta: boolean; p_reserva: string }
        Returns: undefined
      }
      sigo_aqui: { Args: never; Returns: undefined }
      sigo_en_lista: { Args: never; Returns: undefined }
      subio_de_lista: {
        Args: { p_entrada: string; p_viaje: string }
        Returns: string
      }
      vencer_esperas: { Args: never; Returns: undefined }
      vencer_lista_gina: { Args: never; Returns: undefined }
      vencer_senales: { Args: never; Returns: undefined }
      ya_no_espero: { Args: never; Returns: undefined }
    }
    Enums: {
      estado_alerta: "activa" | "resuelta"
      estado_cuenta: "pendiente" | "aprobado" | "rechazado"
      estado_en_lista:
        | "esperando"
        | "en_carro"
        | "subio"
        | "se_fue"
        | "vencida"
        | "no_estaba"
      estado_espera: "esperando" | "reservo" | "cancelada" | "expirada"
      estado_reserva:
        | "activa"
        | "subio"
        | "bajo"
        | "no_llego"
        | "cancelada"
        | "sin_puesto"
        | "rechazada"
      estado_senal: "esperando" | "subio" | "se_fue" | "vencida" | "no_estaba"
      estado_viaje:
        | "programado"
        | "en_camino"
        | "llegando"
        | "en_parada"
        | "en_ruta"
        | "finalizado"
        | "cancelado"
      rol_usuario: "pasajero" | "chofer" | "admin"
      sentido: "vg_a_centro" | "centro_a_vg"
      tipo_alerta: "caucho" | "gasolina" | "accidente" | "mecanica"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      estado_alerta: ["activa", "resuelta"],
      estado_cuenta: ["pendiente", "aprobado", "rechazado"],
      estado_en_lista: [
        "esperando",
        "en_carro",
        "subio",
        "se_fue",
        "vencida",
        "no_estaba",
      ],
      estado_espera: ["esperando", "reservo", "cancelada", "expirada"],
      estado_reserva: [
        "activa",
        "subio",
        "bajo",
        "no_llego",
        "cancelada",
        "sin_puesto",
        "rechazada",
      ],
      estado_senal: ["esperando", "subio", "se_fue", "vencida", "no_estaba"],
      estado_viaje: [
        "programado",
        "en_camino",
        "llegando",
        "en_parada",
        "en_ruta",
        "finalizado",
        "cancelado",
      ],
      rol_usuario: ["pasajero", "chofer", "admin"],
      sentido: ["vg_a_centro", "centro_a_vg"],
      tipo_alerta: ["caucho", "gasolina", "accidente", "mecanica"],
    },
  },
} as const


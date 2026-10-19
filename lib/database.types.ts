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
      desconectar: { Args: never; Returns: undefined }
      desconectar_inactivos: { Args: never; Returns: undefined }
      eliminar_cuenta: { Args: { p_usuario: string }; Returns: undefined }
      es_admin: { Args: never; Returns: boolean }
      es_aprobado: { Args: never; Returns: boolean }
      es_chofer: { Args: never; Returns: boolean }
      lista_viaje: {
        Args: { p_viaje: string }
        Returns: {
          confirmado: boolean
          en_camino: boolean
          es_mio: boolean
          listo: boolean
          nombre_corto: string
          pendiente: boolean
          posicion: number
        }[]
      }
      marcar_espera: {
        Args: {
          p_lat?: number
          p_lng?: number
          p_lugar?: string
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
      nombre_corto: { Args: { p_nombre: string }; Returns: string }
      normalizar_telefono: { Args: { p_telefono: string }; Returns: string }
      ocupar_puesto: {
        Args: { p_nombre?: string; p_viaje: string }
        Returns: string
      }
      omitir_calificacion: { Args: { p_reserva: string }; Returns: undefined }
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
          p_viaje: string
        }
        Returns: string
      }
      resolver_alerta: { Args: { p_alerta: string }; Returns: undefined }
      responder_pedido: {
        Args: { p_acepta: boolean; p_reserva: string }
        Returns: undefined
      }
      vencer_esperas: { Args: never; Returns: undefined }
    }
    Enums: {
      estado_alerta: "activa" | "resuelta"
      estado_cuenta: "pendiente" | "aprobado" | "rechazado"
      estado_espera: "esperando" | "reservo" | "cancelada" | "expirada"
      estado_reserva:
        | "activa"
        | "subio"
        | "bajo"
        | "no_llego"
        | "cancelada"
        | "sin_puesto"
        | "rechazada"
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


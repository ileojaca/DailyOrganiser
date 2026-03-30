import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface Team {
  id: string
  name: string
  description: string | null
  ownerId: string
  inviteCode: string
  maxMembers: number
  createdAt: Date
  updatedAt: Date
}

export interface TeamMember {
  id: string
  teamId: string
  userId: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: Date
  user?: {
    email: string
    fullName: string | null
  }
}

export interface CreateTeamInput {
  name: string
  description?: string
}

export interface UpdateTeamInput {
  name?: string
  description?: string
}

export function useTeams(userId: string | undefined) {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Fetch teams where user is a member
  const fetchTeams = useCallback(async () => {
    if (!userId) {
      setTeams([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Get team IDs where user is a member
      const { data: memberships, error: membershipError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId)

      if (membershipError) throw membershipError

      if (!memberships || memberships.length === 0) {
        setTeams([])
        setLoading(false)
        return
      }

      const teamIds = memberships.map(m => m.team_id)

      // Get team details
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .in('id', teamIds)
        .order('created_at', { ascending: false })

      if (teamsError) throw teamsError

      const formattedTeams: Team[] = (teamsData || []).map(team => ({
        id: team.id,
        name: team.name,
        description: team.description,
        ownerId: team.owner_id,
        inviteCode: team.invite_code,
        maxMembers: team.max_members,
        createdAt: new Date(team.created_at),
        updatedAt: new Date(team.updated_at),
      }))

      setTeams(formattedTeams)
    } catch (err) {
      console.error('Error fetching teams:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch teams'))
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  // Create a new team
  const createTeam = useCallback(async (input: CreateTeamInput): Promise<Team> => {
    if (!userId) throw new Error('User not authenticated')

    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase()

    const { data, error } = await supabase
      .from('teams')
      .insert({
        name: input.name,
        description: input.description || null,
        owner_id: userId,
        invite_code: inviteCode,
        max_members: 10,
      })
      .select()
      .single()

    if (error) throw error

    // Add owner as a team member
    await supabase
      .from('team_members')
      .insert({
        team_id: data.id,
        user_id: userId,
        role: 'owner',
      })

    const newTeam: Team = {
      id: data.id,
      name: data.name,
      description: data.description,
      ownerId: data.owner_id,
      inviteCode: data.invite_code,
      maxMembers: data.max_members,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    }

    setTeams(prev => [newTeam, ...prev])
    return newTeam
  }, [userId])

  // Update a team
  const updateTeam = useCallback(async (teamId: string, input: UpdateTeamInput): Promise<void> => {
    if (!userId) throw new Error('User not authenticated')

    const updateData: Record<string, unknown> = {}
    if (input.name !== undefined) updateData.name = input.name
    if (input.description !== undefined) updateData.description = input.description

    const { error } = await supabase
      .from('teams')
      .update(updateData)
      .eq('id', teamId)

    if (error) throw error

    setTeams(prev =>
      prev.map(team =>
        team.id === teamId
          ? { ...team, ...input, updatedAt: new Date() }
          : team
      )
    )
  }, [userId])

  // Delete a team
  const deleteTeam = useCallback(async (teamId: string): Promise<void> => {
    if (!userId) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId)

    if (error) throw error

    setTeams(prev => prev.filter(team => team.id !== teamId))
  }, [userId])

  // Join a team by invite code
  const joinTeam = useCallback(async (inviteCode: string): Promise<Team> => {
    if (!userId) throw new Error('User not authenticated')

    // Find team by invite code
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('invite_code', inviteCode)
      .single()

    if (teamError || !team) throw new Error('Invalid invite code')

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', team.id)
      .eq('user_id', userId)
      .single()

    if (existingMember) throw new Error('You are already a member of this team')

    // Check member count
    const { count } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', team.id)

    if (count && count >= team.max_members) throw new Error('Team is full')

    // Add as member
    await supabase
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: userId,
        role: 'member',
      })

    const newTeam: Team = {
      id: team.id,
      name: team.name,
      description: team.description,
      ownerId: team.owner_id,
      inviteCode: team.invite_code,
      maxMembers: team.max_members,
      createdAt: new Date(team.created_at),
      updatedAt: new Date(team.updated_at),
    }

    setTeams(prev => [newTeam, ...prev])
    return newTeam
  }, [userId])

  // Leave a team
  const leaveTeam = useCallback(async (teamId: string): Promise<void> => {
    if (!userId) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId)

    if (error) throw error

    setTeams(prev => prev.filter(team => team.id !== teamId))
  }, [userId])

  // Get team members
  const getTeamMembers = useCallback(async (teamId: string): Promise<TeamMember[]> => {
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        *,
        user:users(email, full_name)
      `)
      .eq('team_id', teamId)
      .order('joined_at', { ascending: true })

    if (error) throw error

    return (data || []).map(member => ({
      id: member.id,
      teamId: member.team_id,
      userId: member.user_id,
      role: member.role,
      joinedAt: new Date(member.joined_at),
      user: member.user ? {
        email: member.user.email,
        fullName: member.user.full_name,
      } : undefined,
    }))
  }, [])

  return {
    teams,
    loading,
    error,
    createTeam,
    updateTeam,
    deleteTeam,
    joinTeam,
    leaveTeam,
    getTeamMembers,
    refresh: fetchTeams,
  }
}

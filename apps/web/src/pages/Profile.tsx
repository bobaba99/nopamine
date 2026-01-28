import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { UserRow, UserValueRow, VerdictRow, PurchaseRow, UserDecision } from '../api/types'
import {
  getUserProfile,
  createUserProfile,
  getUserValues,
  createUserValue,
  updateUserValue,
  deleteUserValue,
} from '../api/userService'
import { getVerdictHistory, updateVerdictDecision, deleteVerdict } from '../api/verdictService'
import {
  getPurchaseHistory,
  createPurchase,
  updatePurchase,
  deletePurchase,
} from '../api/purchaseService'
import VerdictDetailModal from '../components/VerdictDetailModal'

type ProfileProps = {
  session: Session | null
}

const valueOptions = [
  {
    value: 'durability',
    label: 'Durability',
    description: 'I value things that last several years.',
  },
  {
    value: 'efficiency',
    label: 'Efficiency',
    description: 'I value tools that saves time for me.',
  },
  {
    value: 'aesthetics',
    label: 'Aesthetics',
    description: "I value items that fit my existing environment's visual language.",
  },
  {
    value: 'interpersonal_value',
    label: 'Interpersonal Value',
    description: 'I value purchases that facilitate shared experiences.',
  },
  {
    value: 'emotional_value',
    label: 'Emotional Value',
    description: 'I value purchases that provide meaningful emotional benefits.',
  },
] as const

export default function Profile({ session }: ProfileProps) {
  const [userRow, setUserRow] = useState<UserRow | null>(null)
  const [userValues, setUserValues] = useState<UserValueRow[]>([])
  const [verdicts, setVerdicts] = useState<VerdictRow[]>([])
  const [purchases, setPurchases] = useState<PurchaseRow[]>([])
  const [status, setStatus] = useState<string>('')
  const [savingValueType, setSavingValueType] = useState<string | null>(null)
  const [purchaseTitle, setPurchaseTitle] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [purchaseVendor, setPurchaseVendor] = useState('')
  const [purchaseCategory, setPurchaseCategory] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [purchaseSaving, setPurchaseSaving] = useState(false)
  const [purchaseEditingId, setPurchaseEditingId] = useState<string | null>(null)
  const [verdictSavingId, setVerdictSavingId] = useState<string | null>(null)
  const [selectedVerdict, setSelectedVerdict] = useState<VerdictRow | null>(null)
  const [editingValues, setEditingValues] = useState(false)

  const loadProfile = async () => {
    if (!session) return

    try {
      const data = await getUserProfile(session.user.id)

      if (!data) {
        // Profile should be auto-created by database trigger on auth signup.
        // If missing, try to create it (handles edge cases / legacy accounts).
        if (!session.user.email) {
          setUserRow(null)
          setStatus('Profile not found and user email is missing.')
          return
        }

        const { error: insertError, isConflict } = await createUserProfile(
          session.user.id,
          session.user.email,
        )

        if (insertError) {
          setUserRow(null)
          if (isConflict) {
            console.error(
              'Email conflict: a users row exists with this email but a different ID.',
              'Run the sync_auth_users migration to fix this.',
            )
            setStatus(
              'Profile sync issue. Please contact support or try signing out and back in.',
            )
            return
          }

          setStatus(`Profile creation failed: ${insertError}`)
          return
        }

        await loadProfile()
        return
      }

      setUserRow(data)
      setStatus('')
    } catch (err) {
      console.error('Profile load error', err)
      setStatus(`Profile load error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const loadUserValues = async () => {
    if (!session) return

    try {
      const data = await getUserValues(session.user.id)
      setUserValues(data)
    } catch (err) {
      setStatus('Unable to load values from Supabase. Check RLS policies.')
    }
  }

  const loadVerdicts = async () => {
    if (!session) return

    try {
      const data = await getVerdictHistory(session.user.id, 10)
      setVerdicts(data)
    } catch (err) {
      setStatus('Unable to load verdicts from Supabase. Check RLS policies.')
    }
  }

  const loadPurchases = async () => {
    if (!session) return

    try {
      const data = await getPurchaseHistory(session.user.id, 10)
      setPurchases(data)
    } catch (err) {
      setStatus('Unable to load purchases from Supabase. Check RLS policies.')
    }
  }

  useEffect(() => {
    if (!session) {
      return
    }

    void loadProfile()
    void loadUserValues()
    void loadVerdicts()
    void loadPurchases()
  }, [session])

  const resetPurchaseForm = () => {
    setPurchaseTitle('')
    setPurchasePrice('')
    setPurchaseVendor('')
    setPurchaseCategory('')
    setPurchaseDate('')
    setPurchaseEditingId(null)
  }

  const getValueForType = (valueType: string): UserValueRow | undefined => {
    return userValues.find((v) => v.value_type === valueType)
  }

  const handleValueChange = async (valueType: string, score: number | null) => {
    if (!session) return

    setSavingValueType(valueType)
    setStatus('')

    const existingValue = getValueForType(valueType)

    if (score === null) {
      // Delete the value
      if (existingValue) {
        const { error } = await deleteUserValue(session.user.id, existingValue.id)
        if (error) {
          setStatus(error)
          setSavingValueType(null)
          return
        }
      }
    } else if (existingValue) {
      // Update existing value
      const { error } = await updateUserValue(session.user.id, existingValue.id, score)
      if (error) {
        setStatus(error)
        setSavingValueType(null)
        return
      }
    } else {
      // Create new value
      const { error } = await createUserValue(valueType, score)
      if (error) {
        setStatus(error)
        setSavingValueType(null)
        return
      }
    }

    await loadUserValues()
    setSavingValueType(null)
  }

  const handlePurchaseSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()
    if (!session) {
      return
    }

    const priceValue = Number(purchasePrice)
    if (!purchaseTitle.trim()) {
      setStatus('Purchase title is required.')
      return
    }
    if (Number.isNaN(priceValue) || priceValue <= 0) {
      setStatus('Purchase price must be a positive number.')
      return
    }
    if (!purchaseDate) {
      setStatus('Purchase date is required.')
      return
    }

    setPurchaseSaving(true)
    setStatus('')

    const payload = {
      title: purchaseTitle.trim(),
      price: priceValue,
      vendor: purchaseVendor.trim() || null,
      category: purchaseCategory.trim() || null,
      purchaseDate: purchaseDate,
      source: 'manual',
    }

    const { error } = purchaseEditingId
      ? await updatePurchase(session.user.id, purchaseEditingId, payload)
      : await createPurchase(payload)

    if (error) {
      setStatus(error)
      setPurchaseSaving(false)
      return
    }

    await loadPurchases()
    resetPurchaseForm()
    setPurchaseSaving(false)
  }

  const handlePurchaseEdit = (purchase: PurchaseRow) => {
    setPurchaseEditingId(purchase.id)
    setPurchaseTitle(purchase.title)
    setPurchasePrice(purchase.price.toString())
    setPurchaseVendor(purchase.vendor ?? '')
    setPurchaseCategory(purchase.category ?? '')
    setPurchaseDate(purchase.purchase_date)
  }

  const handlePurchaseDelete = async (purchaseId: string) => {
    if (!session) return

    setPurchaseSaving(true)
    setStatus('')

    const { error } = await deletePurchase(session.user.id, purchaseId)

    if (error) {
      setStatus(error)
      setPurchaseSaving(false)
      return
    }

    await loadPurchases()
    await loadVerdicts() // Reload verdicts in case a verdict-sourced purchase was deleted
    setPurchaseSaving(false)
  }

  const handleVerdictDecision = async (verdictId: string, decision: UserDecision) => {
    if (!session) return

    setVerdictSavingId(verdictId)
    setStatus('')

    const { error } = await updateVerdictDecision(session.user.id, verdictId, decision)

    if (error) {
      setStatus(error)
      setVerdictSavingId(null)
      return
    }

    await loadVerdicts()
    await loadPurchases() // Reload purchases since decision may add/remove a purchase
    setVerdictSavingId(null)
  }

  const handleVerdictDelete = async (verdictId: string) => {
    if (!session) return

    setVerdictSavingId(verdictId)
    setStatus('')

    const { error } = await deleteVerdict(session.user.id, verdictId)

    if (error) {
      setStatus(error)
      setVerdictSavingId(null)
      return
    }

    await loadVerdicts()
    await loadPurchases() // Reload purchases in case a linked purchase existed
    setVerdictSavingId(null)
  }

  return (
    <section className="route-content">
      <h1>Profile</h1>
      <p>Everything linked to your Supabase account.</p>

      {status && <div className="status error">{status}</div>}

      <div className="profile-grid">
        <div>
          <span className="label">Auth user</span>
          <span className="value">{session?.user.email}</span>
        </div>
      </div>

      <div className="values-section">
        <div className="section-header">
          <h2>Values</h2>
          <button
            type="button"
            className="link"
            onClick={() => setEditingValues(!editingValues)}
          >
            {editingValues ? 'Done' : 'Edit'}
          </button>
        </div>
        {editingValues && (
          <p className="values-description">
            Rate how much each factor matters to you (1 = low, 5 = high)
          </p>
        )}
        <div className="values-grid">
          {valueOptions.map((option) => {
            const existingValue = getValueForType(option.value)
            const currentScore = existingValue?.preference_score ?? null
            const isSaving = savingValueType === option.value

            return (
              <div key={option.value} className={`value-card ${editingValues ? 'editing' : ''}`}>
                <div className="value-card-content">
                  <span className="value-label">{option.label}</span>
                  <span className="description-label">{option.description}</span>
                </div>
                <div className="value-card-footer">
                  {editingValues ? (
                    <div className="slider-container">
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={currentScore ?? 3}
                        onChange={(e) => handleValueChange(option.value, Number(e.target.value))}
                        disabled={isSaving}
                        className="value-slider"
                      />
                      <div className="slider-labels">
                        <span>1</span>
                        <span>2</span>
                        <span>3</span>
                        <span>4</span>
                        <span>5</span>
                      </div>
                      <div className="slider-actions">
                        {currentScore !== null && (
                          <button
                            type="button"
                            className="link danger"
                            disabled={isSaving}
                            onClick={() => handleValueChange(option.value, null)}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="score-display">
                      {currentScore !== null ? `${currentScore}/5` : 'Not set'}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="values-section">
        <h2>Verdict history</h2>
        {verdicts.length === 0 ? (
          <div className="empty-card">No verdicts logged yet.</div>
        ) : (
          <div className="verdict-list">
            {verdicts.map((verdict) => {
              const isSaving = verdictSavingId === verdict.id
              return (
                <div key={verdict.id} className="verdict-card">
                  <div
                    className="verdict-card-clickable"
                    onClick={() => setSelectedVerdict(verdict)}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedVerdict(verdict)}
                    role="button"
                    tabIndex={0}
                  >
                    <div>
                      <span className="stat-label">Item </span>
                      <span className="stat-value">{verdict.candidate_title}</span>
                    </div>
                    <div className="verdict-meta">
                      <span>Recommendation: {verdict.predicted_outcome ?? '—'}</span>
                      <span>
                        Price:{' '}
                        {verdict.candidate_price === null
                          ? '—'
                          : `$${verdict.candidate_price.toFixed(2)}`}
                      </span>
                      <span>
                        Created:{' '}
                        {verdict.created_at
                          ? new Date(verdict.created_at).toLocaleString()
                          : '—'}
                      </span>
                      {verdict.user_decision && (
                        <span className="user-decision">
                          Your decision: <strong>{verdict.user_decision}</strong>
                          {verdict.user_decision === 'hold' && verdict.user_hold_until && (
                            <> (until {new Date(verdict.user_hold_until).toLocaleString()})</>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="verdict-actions">
                    <div className="decision-buttons">
                      <button
                        type="button"
                        className={`decision-btn bought ${verdict.user_decision === 'bought' ? 'active' : ''}`}
                        onClick={() => handleVerdictDecision(verdict.id, 'bought')}
                        disabled={isSaving}
                      >
                        Bought
                      </button>
                      <button
                        type="button"
                        className={`decision-btn hold ${verdict.user_decision === 'hold' ? 'active' : ''}`}
                        onClick={() => handleVerdictDecision(verdict.id, 'hold')}
                        disabled={isSaving}
                      >
                        Hold 24h
                      </button>
                      <button
                        type="button"
                        className={`decision-btn skip ${verdict.user_decision === 'skip' ? 'active' : ''}`}
                        onClick={() => handleVerdictDecision(verdict.id, 'skip')}
                        disabled={isSaving}
                      >
                        Skip
                      </button>
                    </div>
                    <button
                      type="button"
                      className="link danger"
                      onClick={() => handleVerdictDelete(verdict.id)}
                      disabled={isSaving}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="values-section">
        <h2>Purchase history</h2>
        <form className="purchase-form" onSubmit={handlePurchaseSubmit}>
          <label>
            Item title
            <input
              type="text"
              value={purchaseTitle}
              onChange={(event) => setPurchaseTitle(event.target.value)}
              placeholder="Noise cancelling headphones"
              required
            />
          </label>
          <label>
            Price
            <input
              type="number"
              min={0}
              step="0.01"
              value={purchasePrice}
              onChange={(event) => setPurchasePrice(event.target.value)}
              placeholder="129.00"
              required
            />
          </label>
          <label>
            Vendor
            <input
              type="text"
              value={purchaseVendor}
              onChange={(event) => setPurchaseVendor(event.target.value)}
              placeholder="Amazon"
            />
          </label>
          <label>
            Category
            <input
              type="text"
              value={purchaseCategory}
              onChange={(event) => setPurchaseCategory(event.target.value)}
              placeholder="Electronics"
            />
          </label>
          <label>
            Purchase date
            <input
              type="date"
              value={purchaseDate}
              onChange={(event) => setPurchaseDate(event.target.value)}
              required
            />
          </label>
          <div className="values-actions">
            <button className="primary" type="submit" disabled={purchaseSaving}>
              {purchaseSaving
                ? 'Saving...'
                : purchaseEditingId
                  ? 'Update purchase'
                  : 'Add purchase'}
            </button>
            {purchaseEditingId && (
              <button
                className="ghost"
                type="button"
                onClick={resetPurchaseForm}
                disabled={purchaseSaving}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
        {purchases.length === 0 ? (
          <div className="empty-card">No purchases logged yet.</div>
        ) : (
          <div className="verdict-list">
            {purchases.map((purchase) => (
              <div key={purchase.id} className="verdict-card">
                <div>
                  <span className="stat-label">Item</span>
                  <span className="stat-value">{purchase.title}</span>
                </div>
                <div className="verdict-meta">
                  <span>
                    Price: ${Number(purchase.price).toFixed(2)}
                  </span>
                  <span>Vendor: {purchase.vendor ?? '—'}</span>
                  <span>Category: {purchase.category ?? '—'}</span>
                  <span>Source: {purchase.source ?? '—'}</span>
                  <span>
                    Purchase date:{' '}
                    {purchase.purchase_date
                      ? new Date(purchase.purchase_date).toLocaleDateString()
                      : '—'}
                  </span>
                </div>
                <div className="value-actions">
                  <button
                    className="link"
                    type="button"
                    onClick={() => handlePurchaseEdit(purchase)}
                  >
                    Edit
                  </button>
                  <button
                    className="link danger"
                    type="button"
                    onClick={() => handlePurchaseDelete(purchase.id)}
                    disabled={purchaseSaving}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedVerdict && (
        <VerdictDetailModal
          verdict={selectedVerdict}
          isOpen={selectedVerdict !== null}
          onClose={() => setSelectedVerdict(null)}
        />
      )}
    </section>
  )
}

import { useEffect, useRef, useState, type ReactNode } from 'react'

declare global {
  interface Window {
    gsap: any
    ScrollTrigger: any
  }
}

export const useGSAPLoader = () => {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (window.gsap && window.ScrollTrigger) {
      setLoaded(true)
      return
    }

    const loadScript = (src: string) => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = src
        script.async = true
        script.onload = resolve
        script.onerror = reject
        document.body.appendChild(script)
      })
    }

    Promise.all([
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js'),
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js'),
    ]).then(() => {
      // Small delay to ensure registration
      setTimeout(() => {
        if (window.gsap && window.ScrollTrigger) {
          window.gsap.registerPlugin(window.ScrollTrigger)
          setLoaded(true)
        }
      }, 50)
    }).catch(err => console.error('GSAP load failed', err))
  }, [])

  return loaded
}

export const useMagnetic = (strength = 0.35) => {
  const ref = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!window.gsap || !ref.current) return

    const el = ref.current
    const xTo = window.gsap.quickTo(el, "x", { duration: 1, ease: "power3.out" })
    const yTo = window.gsap.quickTo(el, "y", { duration: 1, ease: "power3.out" })

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e
      const { left, top, width, height } = el.getBoundingClientRect()
      const x = clientX - (left + width / 2)
      const y = clientY - (top + height / 2)
      
      xTo(x * strength)
      yTo(y * strength)
    }

    const handleMouseLeave = () => {
      xTo(0)
      yTo(0)
    }

    el.addEventListener('mousemove', handleMouseMove)
    el.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      el.removeEventListener('mousemove', handleMouseMove)
      el.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  return ref
}

export const useGlassShimmer = () => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      el.style.setProperty('--mouse-x', `${x}px`)
      el.style.setProperty('--mouse-y', `${y}px`)
    }

    el.addEventListener('mousemove', handleMouseMove)
    return () => el.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return ref
}

export const CustomCursor = () => {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!window.gsap) return

    const dot = dotRef.current
    const ring = ringRef.current

    window.gsap.set(dot, { xPercent: -50, yPercent: -50 })
    window.gsap.set(ring, { xPercent: -50, yPercent: -50 })

    const xTo = window.gsap.quickTo(ring, "x", { duration: 0.6, ease: "power3" })
    const yTo = window.gsap.quickTo(ring, "y", { duration: 0.6, ease: "power3" })

    const onMouseMove = (e: MouseEvent) => {
      window.gsap.set(dot, { x: e.clientX, y: e.clientY })
      xTo(e.clientX)
      yTo(e.clientY)
    }

    const onHoverStart = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-cursor="expand"]')) {
        window.gsap.to(ring, { scale: 2, duration: 0.3 })
      }
    }

    const onHoverEnd = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-cursor="expand"]')) {
        window.gsap.to(ring, { scale: 1, duration: 0.3 })
      }
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseover', onHoverStart)
    window.addEventListener('mouseout', onHoverEnd)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseover', onHoverStart)
      window.removeEventListener('mouseout', onHoverEnd)
    }
  }, [])

  return (
    <>
      <div ref={dotRef} className="cursor-dot" />
      <div ref={ringRef} className="cursor-ring" />
    </>
  )
}

export const SplitText = ({ children, className }: { children: string, className?: string }) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!window.gsap || !window.ScrollTrigger || !ref.current) return

    const ctx = window.gsap.context(() => {
      const words = ref.current?.querySelectorAll('.word')
      window.gsap.fromTo(words, 
        { y: '110%', rotateX: -40, opacity: 0 },
        {
          y: '0%',
          rotateX: 0,
          opacity: 1,
          stagger: 0.02,
          duration: 0.8,
          ease: 'power4.out',
          scrollTrigger: {
            trigger: ref.current,
            start: 'top 90%',
          }
        }
      )
    }, ref)

    return () => ctx.revert()
  }, [])

  const words = children.split(' ')

  return (
    <div ref={ref} className={`split-text-wrapper ${className || ''}`} style={{ overflow: 'hidden', perspective: '1000px' }}>
      {words.map((word, i) => (
        <span key={i} className="word-wrapper" style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', marginRight: '0.25em' }}>
          <span className="word" style={{ display: 'inline-block', transformOrigin: '0% 100%' }}>
            {word}
          </span>
        </span>
      ))}
    </div>
  )
}

export const MagneticButton = ({ children, className, onClick, disabled, type = 'button' }: any) => {
  const ref = useMagnetic()
  return (
    <button ref={ref} className={className} onClick={onClick} disabled={disabled} type={type} data-cursor="expand">
      {children}
    </button>
  )
}

export const GlassCard = ({ children, className, onClick, onKeyDown, role, tabIndex }: any) => {
  const ref = useGlassShimmer()
  return (
    <div 
      ref={ref} 
      className={`glass-shimmer ${className}`}
      onClick={onClick}
      onKeyDown={onKeyDown}
      role={role}
      tabIndex={tabIndex}
    >
      {children}
    </div>
  )
}

export const LiquidButton = ({ as: Component = 'button', children, className, onClick, disabled, type = 'button', ...props }: any) => {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!window.gsap || !ref.current) return
    const el = ref.current

    const onMouseDown = () => {
      window.gsap.to(el, { scale: 0.98, duration: 0.1, ease: 'power1.out' })
    }

    const onMouseUp = () => {
      window.gsap.to(el, { scale: 1.05, duration: 0.15, ease: 'power2.out', onComplete: () => {
        window.gsap.to(el, { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.3)', onComplete: () => {
          window.gsap.set(el, { clearProps: 'transform' })
        }})
      }})
    }

    const onMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      el.style.setProperty('--x', `${x}px`)
      el.style.setProperty('--y', `${y}px`)
    }

    const onClickRipple = (e: MouseEvent) => {
      if ((el as any).disabled) return

      const rect = el.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const ripple = document.createElement('div')
      ripple.style.position = 'absolute'
      ripple.style.left = `${x}px`
      ripple.style.top = `${y}px`
      ripple.style.width = '0px'
      ripple.style.height = '0px'
      ripple.style.borderRadius = '50%'
      ripple.style.backgroundColor = 'rgba(255, 255, 255, 0.4)'
      ripple.style.transform = 'translate(-50%, -50%)'
      ripple.style.pointerEvents = 'none'
      ripple.style.zIndex = '1'

      el.appendChild(ripple)

      const size = Math.max(rect.width, rect.height) * 2.5

      window.gsap.to(ripple, {
        width: size,
        height: size,
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out',
        onComplete: () => {
          if (el.contains(ripple)) el.removeChild(ripple)
        }
      })
    }

    const ctx = window.gsap.context(() => {
      el.addEventListener('mousedown', onMouseDown)
      el.addEventListener('mouseup', onMouseUp)
      el.addEventListener('mousemove', onMouseMove)
      el.addEventListener('click', onClickRipple)
    }, ref)

    return () => {
      el.removeEventListener('mousedown', onMouseDown)
      el.removeEventListener('mouseup', onMouseUp)
      el.removeEventListener('mousemove', onMouseMove)
      el.removeEventListener('click', onClickRipple)
      ctx.revert()
    }
  }, [])

  return (
    <Component ref={ref} className={`liquid-button ${className || ''}`} onClick={onClick} disabled={disabled} type={type} {...props}>
      <span className="liquid-content">{children}</span>
    </Component>
  )
}

export const VolumetricInput = ({ as: Component = 'input', className, ...props }: any) => {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!window.gsap || !ref.current) return
    const el = ref.current

    // Proximity Glow
    const updateGlow = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY)
      
      // 150px buffer for proximity
      if (dist < 150) {
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        el.style.setProperty('--glow-x', `${x}px`)
        el.style.setProperty('--glow-y', `${y}px`)
        el.style.setProperty('--glow-opacity', `${1 - Math.min(dist / 150, 1)}`)
      } else {
        el.style.setProperty('--glow-opacity', '0')
      }
    }

    window.addEventListener('mousemove', updateGlow)
    return () => {
      window.removeEventListener('mousemove', updateGlow)
    }
  }, [])

  return <Component ref={ref} className={`volumetric-input ${className || ''}`} {...props} />
}
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { userId, amount, currency, paymentMethod, credits } = await request.json()
    
    if (!userId || !amount || !credits) {
      return NextResponse.json(
        { error: { message: 'Missing required fields' } },
        { status: 400 }
      )
    }

    // 创建Stripe支付意图
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // 转换为分
      currency: currency || 'usd',
      payment_method_types: paymentMethod === 'alipay' ? ['alipay'] : ['card'],
      metadata: { 
        userId,
        credits: credits.toString(),
        paymentMethod 
      },
      automatic_payment_methods: {
        enabled: true,
      },
    })

    // 保存交易记录到Supabase
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        amount,
        currency: currency || 'usd',
        payment_method: paymentMethod,
        status: 'pending',
        stripe_payment_intent_id: paymentIntent.id,
        credits_purchased: credits,
        created_at: new Date().toISOString()
      })

    if (transactionError) {
      console.error('Transaction save error:', transactionError)
      // 即使保存失败也返回支付意图，让前端可以继续支付流程
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    })

  } catch (err: any) {
    console.error('Payment API error:', err)
    return NextResponse.json(
      { error: { message: err.message || 'Payment processing failed' } },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const { paymentIntentId, status } = await request.json()
    
    if (!paymentIntentId || !status) {
      return NextResponse.json(
        { error: { message: 'Missing payment intent ID or status' } },
        { status: 400 }
      )
    }

    // 更新交易状态
    const { error } = await supabase
      .from('transactions')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', paymentIntentId)

    if (error) {
      console.error('Transaction update error:', error)
      return NextResponse.json(
        { error: { message: 'Failed to update transaction' } },
        { status: 500 }
      )
    }

    // 如果支付成功，为用户添加积分
    if (status === 'succeeded') {
      const { data: transaction } = await supabase
        .from('transactions')
        .select('user_id, credits_purchased')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .single()

      if (transaction) {
        // 更新用户积分
        const { error: creditError } = await supabase
          .from('profiles')
          .update({ 
            credits: supabase.rpc('increment_credits', { 
              user_id: transaction.user_id, 
              amount: transaction.credits_purchased 
            })
          })
          .eq('id', transaction.user_id)

        if (creditError) {
          console.error('Credit update error:', creditError)
        }
      }
    }

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('Payment update error:', err)
    return NextResponse.json(
      { error: { message: err.message || 'Failed to update payment' } },
      { status: 500 }
    )
  }
} 
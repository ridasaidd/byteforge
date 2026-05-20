<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuoteLineItem extends Model
{
    use HasFactory;

    /** @var list<string> */
    protected $fillable = [
        'quote_id',
        'label',
        'description',
        'quantity',
        'unit_price_minor',
        'line_total_minor',
        'sort_order',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'quantity' => 'decimal:2',
        'unit_price_minor' => 'integer',
        'line_total_minor' => 'integer',
        'sort_order' => 'integer',
    ];

    public function quote(): BelongsTo
    {
        return $this->belongsTo(Quote::class, 'quote_id');
    }
}

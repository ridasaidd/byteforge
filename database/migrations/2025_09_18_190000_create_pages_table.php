<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('pages', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id'); // Stancl Tenancy: string ID
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->string('title');
            $table->string('slug');
            $table->string('page_type')->default('general'); // home, about, contact, etc.
            $table->json('puck_data')->nullable(); // Puck component structure
            $table->json('meta_data')->nullable(); // SEO meta tags
            $table->string('status')->default('draft'); // draft, published, archived
            $table->boolean('is_homepage')->default(false);
            $table->integer('sort_order')->default(0);
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            // Indexes for performance
            $table->index(['status']);
            $table->index(['page_type']);
            $table->index(['sort_order']);
            $table->unique(['tenant_id', 'slug']); // Unique per tenant
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pages');
    }
};
